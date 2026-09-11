import type { resolveTypeScriptProject as ResolveTypeScriptProject } from '@atls/raijin/config/typescript'
import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import type { LibraryDiagnostic }       from './diagnostic.js'
import type { LibraryBuildInput }       from './input.js'

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
  let project = await resolveProject()

  if (project.options.rootDir === undefined) {
    project = await resolveProject(input.sourceRoot)
  }

  const host = typescript.createCompilerHost(project.options)
  const program = typescript.createProgram({
    configFileParsingDiagnostics: [...project.errors],
    host,
    options: project.options,
    projectReferences: project.projectReferences ? [...project.projectReferences] : undefined,
    rootNames: [...project.fileNames],
  })
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
