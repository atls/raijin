import type { resolveTypeScriptProject as ResolveTypeScriptProject } from '@atls/raijin/config/typescript'
import type { TypeScriptProjectConfig }         from '@atls/raijin/config/typescript'
import type { ts as TypeScriptRuntime }         from '@atls/raijin/typescript'

import type { TypecheckProjectInput }           from './interfaces/input.js'
import type { TypecheckProjectCompletedResult } from './interfaces/result.js'
import type { TypecheckProjectResult }          from './interfaces/result.js'

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'
const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

const importTypeScriptModules = async (): Promise<{
  resolveTypeScriptProject: typeof ResolveTypeScriptProject
  typescript: typeof TypeScriptRuntime
}> => {
  const [config, runtime] = await Promise.all([
    import(TYPESCRIPT_CONFIG_SPECIFIER) as Promise<{
      resolveTypeScriptProject: typeof ResolveTypeScriptProject
    }>,
    import(TYPESCRIPT_RUNTIME_SPECIFIER) as Promise<{ ts: typeof TypeScriptRuntime }>,
  ])

  return {
    resolveTypeScriptProject: config.resolveTypeScriptProject,
    typescript: runtime.ts,
  }
}

const checkProgram = (
  project: TypeScriptProjectConfig,
  typescript: typeof TypeScriptRuntime
): Pick<TypecheckProjectCompletedResult, 'diagnostics' | 'files'> => {
  const files = [...project.fileNames]
  const program = typescript.createProgram({
    rootNames: files,
    options: {
      ...project.options,
      noEmit: true,
    },
    projectReferences: project.projectReferences ? [...project.projectReferences] : undefined,
  })

  return {
    diagnostics: typescript.getPreEmitDiagnostics(program),
    files,
  }
}

const checkSolution = (
  configFileName: string,
  typescript: typeof TypeScriptRuntime
): Pick<TypecheckProjectCompletedResult, 'diagnostics' | 'files'> => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const files: Array<string> = []
  const noEmitSystem: TypeScriptRuntime.System = {
    ...typescript.sys,
    createDirectory: () => undefined,
    deleteFile: () => undefined,
    writeFile: () => undefined,
  }

  delete noEmitSystem.setModifiedTime
  const host = typescript.createSolutionBuilderHost(noEmitSystem, undefined, (diagnostic) =>
    diagnostics.push(diagnostic))
  const { createProgram } = host

  host.createProgram = (
    rootNames,
    options,
    compilerHost,
    oldProgram,
    configFileParsingDiagnostics,
    projectReferences
  ) => {
    files.push(...(rootNames ?? []))

    return createProgram(
      rootNames,
      {
        ...options,
        noEmit: true,
      },
      compilerHost,
      oldProgram,
      configFileParsingDiagnostics,
      projectReferences
    )
  }

  typescript.createSolutionBuilder(host, [configFileName], { force: true }).build()

  return {
    diagnostics,
    files: Array.from(new Set(files)),
  }
}

export const typecheckProjectSources = async ({
  cwd,
  manifestCwds,
  targets,
}: TypecheckProjectInput): Promise<TypecheckProjectResult> => {
  try {
    const { resolveTypeScriptProject, typescript } = await importTypeScriptModules()
    const project = await resolveTypeScriptProject({
      cwd,
      manifestCwds,
      selection:
        targets && targets.length > 0
          ? {
              kind: 'explicit',
              patterns: targets,
            }
          : undefined,
      typescript,
    })

    if (project.errors.length > 0) {
      return {
        status: 'completed',
        diagnostics: typescript.sortAndDeduplicateDiagnostics([...project.errors]),
        files: [],
        terminal: { exitCode: 1, reason: 'diagnostics' },
      }
    }

    const checked =
      project.configFileName && (project.projectReferences?.length ?? 0) > 0
        ? checkSolution(project.configFileName, typescript)
        : checkProgram(project, typescript)
    const diagnostics = typescript.sortAndDeduplicateDiagnostics([...checked.diagnostics])

    return diagnostics.length > 0
      ? {
          status: 'completed',
          diagnostics,
          files: checked.files,
          terminal: { exitCode: 1, reason: 'diagnostics' },
        }
      : {
          status: 'completed',
          diagnostics,
          files: checked.files,
          terminal: { exitCode: 0, reason: 'clean' },
        }
  } catch (error) {
    return {
      status: 'provider-failed',
      failure: {
        name: error instanceof Error ? error.name : 'Error',
        message: error instanceof Error ? error.message : String(error),
      },
      terminal: { exitCode: 1, reason: 'provider-failed' },
    }
  }
}
