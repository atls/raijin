import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { isAbsolute }                  from 'node:path'
import { relative }                    from 'node:path'
import { sep }                         from 'node:path'

const PROJECT_CONFIG = 'tsconfig.json'

const parseProjects = (
  rootConfigFileName: string,
  typescript: typeof TypeScriptRuntime
): {
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
  readonly projects: ReadonlyArray<TypeScriptRuntime.ParsedCommandLine>
} => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const projects: Array<TypeScriptRuntime.ParsedCommandLine> = []
  const pending = [rootConfigFileName]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const configFileName = pending.shift()

    if (!configFileName) {
      continue
    }

    const resolvedConfigFileName = typescript.sys.resolvePath(configFileName)
    const canonicalConfigFileName = typescript.sys.useCaseSensitiveFileNames
      ? resolvedConfigFileName
      : resolvedConfigFileName.toLowerCase()

    if (visited.has(canonicalConfigFileName)) {
      continue
    }

    visited.add(canonicalConfigFileName)

    const parseDiagnostics: Array<TypeScriptRuntime.Diagnostic> = []
    const commandLine = typescript.getParsedCommandLineOfConfigFile(
      resolvedConfigFileName,
      undefined,
      {
        ...typescript.sys,
        onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
          parseDiagnostics.push(diagnostic)
        },
      }
    )

    if (!commandLine) {
      diagnostics.push(...parseDiagnostics)

      continue
    }

    projects.push(commandLine)
    pending.push(
      ...(commandLine.projectReferences?.map((reference) =>
        typescript.resolveProjectReferencePath(reference)) ?? [])
    )
  }

  return { diagnostics, projects }
}

const checkPrograms = (
  projects: ReadonlyArray<TypeScriptRuntime.ParsedCommandLine>,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> =>
  projects.flatMap((commandLine) => {
    const options: TypeScriptRuntime.CompilerOptions = {
      ...commandLine.options,
      ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
      noEmit: true,
    }
    const host = Object.assign(typescript.createCompilerHost(options), {
      useSourceOfProjectReferenceRedirect: (): true => true,
    })
    const program = typescript.createProgram({
      rootNames: commandLine.fileNames,
      options,
      host,
      configFileParsingDiagnostics: commandLine.errors,
      projectReferences: commandLine.projectReferences,
    })

    return [...typescript.getPreEmitDiagnostics(program)]
  })

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
      const relativeFileName = relative(
        resolvedProjectCwd,
        typescript.sys.resolvePath(fileName)
      )

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

  const parsed = parseProjects(rootConfigFileName, typescript)

  return [
    ...parsed.diagnostics,
    ...checkPrograms(parsed.projects, typecheckSkipLibCheck, typescript),
  ]
}
