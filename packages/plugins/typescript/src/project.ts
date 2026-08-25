import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'
import { sep }                          from 'node:path'

const PROJECT_CONFIG = 'tsconfig.json'

const createDiagnosticsProgram = (
  commandLine: TypeScriptRuntime.ParsedCommandLine,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): TypeScriptRuntime.Program => {
  const options: TypeScriptRuntime.CompilerOptions = {
    ...commandLine.options,
    ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
    noEmit: true,
  }
  const host = Object.assign(typescript.createCompilerHost(options), {
    useSourceOfProjectReferenceRedirect: (): true => true,
  })

  return typescript.createProgram({
    rootNames: commandLine.fileNames,
    options,
    host,
    configFileParsingDiagnostics: commandLine.errors,
    projectReferences: commandLine.projectReferences,
  })
}

const checkPrograms = (
  rootProgram: TypeScriptRuntime.Program,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const diagnostics = [...typescript.getPreEmitDiagnostics(rootProgram)]
  const scheduledProjectPaths = new Set<string>()
  const checkReferences = (
    references: ReadonlyArray<TypeScriptRuntime.ResolvedProjectReference | undefined> | undefined
  ): void => {
    references?.forEach((reference) => {
      if (!reference || scheduledProjectPaths.has(reference.sourceFile.path)) {
        return
      }

      scheduledProjectPaths.add(reference.sourceFile.path)

      const program = createDiagnosticsProgram(
        reference.commandLine,
        typecheckSkipLibCheck,
        typescript
      )

      diagnostics.push(...typescript.getPreEmitDiagnostics(program))
      checkReferences(reference.references)
    })
  }

  checkReferences(rootProgram.getResolvedProjectReferences())

  return diagnostics
}

export const checkProject = (
  cwd: string,
  projectCwd: string,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> | undefined => {
  const resolvedProjectCwd = typescript.sys.resolvePath(projectCwd)
  const rootConfigFileName = typescript.findConfigFile(
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

  const rootProgram = createDiagnosticsProgram(rootCommandLine, typecheckSkipLibCheck, typescript)

  return [...parseDiagnostics, ...checkPrograms(rootProgram, typecheckSkipLibCheck, typescript)]
}
