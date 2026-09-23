import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import type { TypecheckInput }          from './interfaces/input.js'

import { isAbsolute }                   from 'node:path'
import { dirname }                      from 'node:path'
import { relative }                     from 'node:path'
import { sep }                          from 'node:path'

const PROJECT_CONFIG = 'tsconfig.json'
const AMBIGUOUS_PROJECT_ROOT_DIAGNOSTIC_CODE = 2209

const createDiagnosticsProgram = (
  commandLine: TypeScriptRuntime.ParsedCommandLine,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime,
  files?: ReadonlyArray<string>,
  rootDir?: string
): TypeScriptRuntime.Program => {
  const options: TypeScriptRuntime.CompilerOptions = {
    ...commandLine.options,
    ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
    ...(rootDir === undefined ? {} : { rootDir }),
    noEmit: true,
  }
  const host = Object.assign(typescript.createCompilerHost(options), {
    useSourceOfProjectReferenceRedirect: (): true => true,
  })

  return typescript.createProgram({
    rootNames: files ?? commandLine.fileNames,
    options,
    host,
    configFileParsingDiagnostics: commandLine.errors,
    ...(files === undefined ? { projectReferences: commandLine.projectReferences } : {}),
  })
}

const checkDiagnosticsProgram = (
  commandLine: TypeScriptRuntime.ParsedCommandLine,
  configFileName: string,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime,
  files?: ReadonlyArray<string>
): {
  program: TypeScriptRuntime.Program
  diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
} => {
  const program = createDiagnosticsProgram(commandLine, typecheckSkipLibCheck, typescript, files)
  const diagnostics = typescript.getPreEmitDiagnostics(program)

  if (
    commandLine.options.rootDir !== undefined ||
    !diagnostics.some(({ code }) => code === AMBIGUOUS_PROJECT_ROOT_DIAGNOSTIC_CODE)
  ) {
    return { program, diagnostics }
  }

  const resolvedProgram = createDiagnosticsProgram(
    commandLine,
    typecheckSkipLibCheck,
    typescript,
    files,
    dirname(configFileName)
  )

  return {
    program: resolvedProgram,
    diagnostics: typescript.getPreEmitDiagnostics(resolvedProgram),
  }
}

const checkResolvedReferences = (
  rootProgram: TypeScriptRuntime.Program,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const checkedProjectPaths = new Set<string>()

  const checkReferences = (
    references: ReadonlyArray<TypeScriptRuntime.ResolvedProjectReference | undefined> | undefined
  ): void => {
    references?.forEach((reference) => {
      if (!reference || checkedProjectPaths.has(reference.sourceFile.fileName)) {
        return
      }

      checkedProjectPaths.add(reference.sourceFile.fileName)

      const { diagnostics: referenceDiagnostics } = checkDiagnosticsProgram(
        reference.commandLine,
        reference.sourceFile.fileName,
        typecheckSkipLibCheck,
        typescript
      )

      diagnostics.push(...referenceDiagnostics)
      checkReferences(reference.references)
    })
  }

  checkReferences(rootProgram.getResolvedProjectReferences())

  return diagnostics
}

export const findProjectConfig = (
  cwd: string,
  projectCwd: string,
  typescript: typeof TypeScriptRuntime
): string | undefined => {
  const resolvedProjectCwd = typescript.sys.resolvePath(projectCwd)

  return typescript.findConfigFile(
    cwd,
    (fileName) => {
      const relativeFileName = relative(resolvedProjectCwd, typescript.sys.resolvePath(fileName))

      return (
        relativeFileName !== '..' &&
        !relativeFileName.startsWith(`..${sep}`) &&
        !isAbsolute(relativeFileName) &&
        typescript.sys.fileExists(fileName)
      )
    },
    PROJECT_CONFIG
  )
}

export const checkProject = (
  input: TypecheckInput,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> | undefined => {
  const rootConfigFileName = findProjectConfig(input.cwd, input.projectCwd, typescript)

  if (!rootConfigFileName) {
    return undefined
  }

  const parseDiagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const rootCommandLine = typescript.getParsedCommandLineOfConfigFile(
    rootConfigFileName,
    undefined,
    {
      ...typescript.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        parseDiagnostics.push(diagnostic)
      },
    }
  )

  if (!rootCommandLine) {
    return parseDiagnostics
  }

  const { program: rootProgram, diagnostics: rootDiagnostics } = checkDiagnosticsProgram(
    rootCommandLine,
    rootConfigFileName,
    typecheckSkipLibCheck,
    typescript,
    input.kind === 'files' ? input.files : undefined
  )
  const diagnostics = [...parseDiagnostics, ...rootDiagnostics]

  return input.kind === 'files'
    ? diagnostics
    : [...diagnostics, ...checkResolvedReferences(rootProgram, typecheckSkipLibCheck, typescript)]
}
