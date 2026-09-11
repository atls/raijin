import type { resolveTypeScriptProject as ResolveTypeScriptProject } from '@atls/raijin/config/typescript'
import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import type { LibraryDiagnostic }       from './diagnostic.js'
import type { LibraryBuildInput }       from './input.js'

import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'
import { sep }                          from 'node:path'

import { resolveRaijinRuntimeUrl }      from '@atls/raijin/runtime-resolver'

import { rewriteLegacyJsxSpecifiers }   from './compatibility/legacy-jsx.js'

export interface TypeScriptEmission {
  readonly declarationMaps: boolean
  readonly diagnostics: ReadonlyArray<LibraryDiagnostic>
  readonly emitSkipped: boolean
  readonly javascriptSourceMaps: boolean
}

interface TypeScriptConfigProvider {
  readonly resolveTypeScriptProject: typeof ResolveTypeScriptProject
}

interface TypeScriptProvider {
  readonly ts: typeof TypeScriptRuntime
}

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'
const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'
const AMBIGUOUS_PROJECT_ROOT_DIAGNOSTIC_CODE = 2209

const isWithinRoot = (root: string, path: string): boolean => {
  const rootRelative = relative(root, path)

  return rootRelative !== '..' && !rootRelative.startsWith(`..${sep}`) && !isAbsolute(rootRelative)
}

const toDiagnostic = (
  diagnostic: TypeScriptRuntime.Diagnostic,
  typescript: typeof TypeScriptRuntime
): LibraryDiagnostic => {
  const position =
    diagnostic.file && diagnostic.start !== undefined
      ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start)
      : undefined

  return {
    category: typescript.DiagnosticCategory[
      diagnostic.category
    ].toLowerCase() as LibraryDiagnostic['category'],
    code: diagnostic.code,
    ...(diagnostic.file
      ? { file: diagnostic.file.fileName, sourceText: diagnostic.file.text }
      : {}),
    ...(position ? { column: position.character + 1, line: position.line + 1 } : {}),
    message: typescript.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
  }
}

export const emitTypeScript = async (
  input: LibraryBuildInput,
  outputRoot: string
): Promise<TypeScriptEmission> => {
  const [{ resolveTypeScriptProject }, { ts: typescript }] = (await Promise.all([
    import(resolveRaijinRuntimeUrl(input.cwd, TYPESCRIPT_CONFIG_SPECIFIER)),
    import(resolveRaijinRuntimeUrl(input.cwd, TYPESCRIPT_RUNTIME_SPECIFIER)),
  ])) as [TypeScriptConfigProvider, TypeScriptProvider]
  const resolveProject = (rootDir?: string) =>
    resolveTypeScriptProject({
      compilerOptions: {
        composite: false,
        declaration: true,
        declarationDir: outputRoot,
        emitDeclarationOnly: false,
        incremental: false,
        noEmit: false,
        outDir: outputRoot,
        rewriteRelativeImportExtensions: true,
        ...(rootDir ? { rootDir } : {}),
        tsBuildInfoFile: undefined,
      },
      cwd: input.cwd,
      selection: { kind: 'explicit', patterns: [input.sourceRoot] },
      typescript,
    })
  const createProgram = (project: Awaited<ReturnType<typeof resolveProject>>) => {
    const host = typescript.createCompilerHost(project.options)

    return typescript.createProgram({
      configFileParsingDiagnostics: [...project.errors],
      host,
      options: project.options,
      projectReferences: project.projectReferences ? [...project.projectReferences] : undefined,
      rootNames: [...project.fileNames],
    })
  }
  let project = await resolveProject()
  let program = createProgram(project)
  const requiresExplicitRoot = typescript
    .getPreEmitDiagnostics(program)
    .some(({ code }) => code === AMBIGUOUS_PROJECT_ROOT_DIAGNOSTIC_CODE)
  const hasSourceOutsideRoot = program
    .getSourceFiles()
    .some(
      (source) =>
        !source.isDeclarationFile &&
        !program.isSourceFileFromExternalLibrary(source) &&
        !isWithinRoot(input.sourceRoot, source.fileName)
    )

  if (project.options.rootDir === undefined && requiresExplicitRoot && !hasSourceOutsideRoot) {
    project = await resolveProject(input.sourceRoot)
    program = createProgram(project)
  }

  const emitted = program.emit(undefined, undefined, undefined, undefined, {
    after: [rewriteLegacyJsxSpecifiers(typescript, project.options.jsx)],
  })
  const diagnostics = typescript
    .sortAndDeduplicateDiagnostics([
      ...typescript.getPreEmitDiagnostics(program),
      ...emitted.diagnostics,
    ])
    .map((diagnostic) => toDiagnostic(diagnostic, typescript))

  return {
    declarationMaps: project.options.declarationMap === true,
    diagnostics,
    emitSkipped: emitted.emitSkipped,
    javascriptSourceMaps: project.options.sourceMap === true,
  }
}
