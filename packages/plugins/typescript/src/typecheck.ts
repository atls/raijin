import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { join }                         from 'node:path'

const PROJECT_CONFIG = 'tsconfig.json'
const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

export type TypecheckTarget = {
  readonly path: string
  readonly request: string
}

export type TypecheckManifestPolicySource = {
  readonly cwd: string
  readonly typecheckSkipLibCheck?: unknown
}

export type TypecheckProjectInput = {
  readonly cwd: string
  readonly manifestPolicySources?: ReadonlyArray<TypecheckManifestPolicySource>
  readonly rootCwd: string
  readonly targets?: ReadonlyArray<TypecheckTarget>
}

export type TypecheckTerminal =
  | { readonly exitCode: 0; readonly reason: 'clean' }
  | { readonly exitCode: 1; readonly reason: 'diagnostics' }
  | { readonly exitCode: 1; readonly reason: 'incomplete-project-graph' }
  | { readonly exitCode: 1; readonly reason: 'invalid-policy' }
  | { readonly exitCode: 1; readonly reason: 'missing-project' }
  | { readonly exitCode: 1; readonly reason: 'provider-failed' }
  | { readonly exitCode: 1; readonly reason: 'unresolved-target' }

type TypecheckProjectCheckedFields = {
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
}

export type TypecheckProjectCleanResult = TypecheckProjectCheckedFields & {
  readonly status: 'clean'
  readonly terminal: Extract<TypecheckTerminal, { reason: 'clean' }>
}

export type TypecheckProjectDiagnosticsResult = TypecheckProjectCheckedFields & {
  readonly status: 'diagnostics'
  readonly terminal: Extract<TypecheckTerminal, { reason: 'diagnostics' }>
}

export type TypecheckProjectMissingResult = {
  readonly status: 'missing-project'
  readonly cwd: string
  readonly terminal: Extract<TypecheckTerminal, { reason: 'missing-project' }>
}

export type TypecheckProjectUnresolvedTargetResult = {
  readonly status: 'unresolved-target'
  readonly targets: ReadonlyArray<TypecheckTarget>
  readonly terminal: Extract<TypecheckTerminal, { reason: 'unresolved-target' }>
}

export type TypecheckProjectProviderFailedResult = {
  readonly status: 'provider-failed'
  readonly failure: {
    readonly name: string
    readonly message: string
  }
  readonly terminal: Extract<TypecheckTerminal, { reason: 'provider-failed' }>
}

type TypecheckProjectInternalFailedResult = {
  readonly status: 'internal-failed'
  readonly reason: 'incomplete-project-graph'
  readonly missingConfigPaths: ReadonlyArray<string>
  readonly terminal: Extract<TypecheckTerminal, { reason: 'incomplete-project-graph' }>
}

type TypecheckProjectInvalidPolicyResult = {
  readonly status: 'invalid-policy'
  readonly cwd: string
  readonly policy: 'typecheckSkipLibCheck'
  readonly expected: 'boolean'
  readonly terminal: Extract<TypecheckTerminal, { reason: 'invalid-policy' }>
}

export type TypecheckProjectResult =
  | TypecheckProjectCleanResult
  | TypecheckProjectDiagnosticsResult
  | TypecheckProjectInternalFailedResult
  | TypecheckProjectInvalidPolicyResult
  | TypecheckProjectMissingResult
  | TypecheckProjectProviderFailedResult
  | TypecheckProjectUnresolvedTargetResult

type ParsedProject = {
  readonly commandLine?: TypeScriptRuntime.ParsedCommandLine
  readonly configFileName: string
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
}

type PreparedProject = ParsedProject & {
  readonly program?: TypeScriptRuntime.Program
}

type ParsedProjectGraph = {
  readonly discoveryDiagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
  readonly projects: ReadonlyArray<ParsedProject>
}

type CheckedProject = {
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
}

type SelectedProjectGraph = {
  readonly missingConfigPaths: ReadonlyArray<string>
  readonly projects: ReadonlyArray<PreparedProject>
}

type ProjectReferenceRedirectHost = TypeScriptRuntime.CompilerHost & {
  useSourceOfProjectReferenceRedirect?: () => boolean
}

const importTypeScript = async (): Promise<typeof TypeScriptRuntime> => {
  const runtime = await (import(TYPESCRIPT_RUNTIME_SPECIFIER) as Promise<{
    ts: typeof TypeScriptRuntime
  }>)

  return runtime.ts
}

const toCanonicalPath = (path: string, typescript: typeof TypeScriptRuntime): string => {
  const resolved = typescript.sys.resolvePath(path)
  const real = typescript.sys.fileExists(resolved)
    ? (typescript.sys.realpath?.(resolved) ?? resolved)
    : resolved

  return typescript.sys.useCaseSensitiveFileNames ? real : real.toLowerCase()
}

const uniquePaths = (
  paths: ReadonlyArray<string>,
  typescript: typeof TypeScriptRuntime
): Array<string> =>
  Array.from(
    paths
      .reduce((result, path) => {
        const canonicalPath = toCanonicalPath(path, typescript)

        return result.has(canonicalPath) ? result : result.set(canonicalPath, path)
      }, new Map<string, string>())
      .values()
  )

const resolveProjectCwd = (
  cwd: string,
  rootCwd: string,
  typescript: typeof TypeScriptRuntime
): string => (typescript.sys.fileExists(join(cwd, PROJECT_CONFIG)) ? cwd : rootCwd)

const resolveTypecheckSkipLibCheck = (
  sources: ReadonlyArray<TypecheckManifestPolicySource>,
  manifestCwds: ReadonlyArray<string>,
  typescript: typeof TypeScriptRuntime
): TypecheckProjectInvalidPolicyResult | boolean | undefined => {
  const applicableCwds = new Set(
    uniquePaths(manifestCwds, typescript).map((cwd) => toCanonicalPath(cwd, typescript))
  )
  const uniqueSources = Array.from(
    sources
      .reduce((result, source) => {
        const canonicalCwd = toCanonicalPath(source.cwd, typescript)

        return result.has(canonicalCwd) ? result : result.set(canonicalCwd, source)
      }, new Map<string, TypecheckManifestPolicySource>())
      .values()
  )
  const configured = [...uniqueSources]
    .filter(({ cwd }) => applicableCwds.has(toCanonicalPath(cwd, typescript)))
    .reverse()
    .find((source) => Object.hasOwn(source, 'typecheckSkipLibCheck'))

  if (!configured) {
    return undefined
  }

  if (typeof configured.typecheckSkipLibCheck !== 'boolean') {
    return {
      status: 'invalid-policy',
      cwd: configured.cwd,
      policy: 'typecheckSkipLibCheck',
      expected: 'boolean',
      terminal: { exitCode: 1, reason: 'invalid-policy' },
    }
  }

  return configured.typecheckSkipLibCheck
}

const parseProjectGraph = (
  rootConfigFileName: string,
  typescript: typeof TypeScriptRuntime
): ParsedProjectGraph => {
  const discoveryDiagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const projects: Array<ParsedProject> = []
  const pending = [rootConfigFileName]
  const visited = new Set<string>()
  const canonicalRootConfigFileName = toCanonicalPath(rootConfigFileName, typescript)

  while (pending.length > 0) {
    const configFileName = pending.shift()

    if (!configFileName) {
      continue
    }

    const canonicalConfigFileName = toCanonicalPath(configFileName, typescript)

    if (visited.has(canonicalConfigFileName)) {
      continue
    }

    visited.add(canonicalConfigFileName)

    const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []
    const commandLine = typescript.getParsedCommandLineOfConfigFile(configFileName, undefined, {
      ...typescript.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        diagnostics.push(diagnostic)

        if (canonicalConfigFileName === canonicalRootConfigFileName) {
          discoveryDiagnostics.push(diagnostic)
        }
      },
    })

    if (commandLine) {
      diagnostics.push(...commandLine.errors)

      if (canonicalConfigFileName === canonicalRootConfigFileName) {
        discoveryDiagnostics.push(...commandLine.errors)
      }
    }

    projects.push({
      commandLine,
      configFileName,
      diagnostics: typescript.sortAndDeduplicateDiagnostics(diagnostics),
    })
    pending.push(
      ...(commandLine?.projectReferences?.map((reference) =>
        typescript.resolveProjectReferencePath(reference)) ?? [])
    )
  }

  return {
    discoveryDiagnostics: typescript.sortAndDeduplicateDiagnostics(discoveryDiagnostics),
    projects,
  }
}

const prepareProject = (
  project: ParsedProject,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): PreparedProject => {
  if (!project.commandLine) {
    return project
  }

  const options: TypeScriptRuntime.CompilerOptions = {
    ...project.commandLine.options,
    ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
    noEmit: true,
  }
  const host: ProjectReferenceRedirectHost = typescript.createCompilerHost(options)

  host.useSourceOfProjectReferenceRedirect = () => true

  return {
    ...project,
    program: typescript.createProgram({
      rootNames: project.commandLine.fileNames,
      options,
      host,
      configFileParsingDiagnostics: project.commandLine.errors,
      projectReferences: project.commandLine.projectReferences,
    }),
  }
}

const resolveTargetProjects = (
  projects: ReadonlyArray<PreparedProject>,
  targets: ReadonlyArray<TypecheckTarget>,
  typescript: typeof TypeScriptRuntime
): {
  readonly configFileNames: ReadonlyArray<string>
  readonly unresolvedTargets: ReadonlyArray<TypecheckTarget>
} => {
  const targetPaths = new Map(
    targets.map((target) => [toCanonicalPath(target.path, typescript), target] as const)
  )
  const resolvedTargets = new Set<string>()
  const configFileNames: Array<string> = []
  const directOwners = new Map<string, Array<string>>()
  const importedOwners = new Map<string, Array<string>>()

  projects.forEach(({ commandLine, configFileName }) => {
    if (!commandLine) {
      return
    }

    const configuredFiles = new Set(
      commandLine.fileNames.map((fileName) => toCanonicalPath(fileName, typescript))
    )

    targetPaths.forEach((_target, targetPath) => {
      if (configuredFiles.has(targetPath)) {
        directOwners.set(targetPath, [...(directOwners.get(targetPath) ?? []), configFileName])
      }
    })
  })

  const targetsWithoutDirectOwners = new Set(
    Array.from(targetPaths.keys()).filter((targetPath) => !directOwners.has(targetPath))
  )

  projects.forEach(({ configFileName, program }) => {
    if (!program || targetsWithoutDirectOwners.size === 0) {
      return
    }

    const sourceFiles = new Set(
      program.getSourceFiles().map(({ fileName }) => toCanonicalPath(fileName, typescript))
    )

    targetsWithoutDirectOwners.forEach((targetPath) => {
      if (sourceFiles.has(targetPath)) {
        importedOwners.set(targetPath, [...(importedOwners.get(targetPath) ?? []), configFileName])
      }
    })
  })

  targetPaths.forEach((_target, targetPath) => {
    const owners = directOwners.get(targetPath) ?? importedOwners.get(targetPath) ?? []

    if (owners.length > 0) {
      resolvedTargets.add(targetPath)
      configFileNames.push(...owners)
    }
  })

  return {
    configFileNames: uniquePaths(configFileNames, typescript),
    unresolvedTargets: targets.filter(
      ({ path }) => !resolvedTargets.has(toCanonicalPath(path, typescript))
    ),
  }
}

const checkFiles = (
  targets: ReadonlyArray<TypecheckTarget>,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): CheckedProject => {
  const files = uniquePaths(
    targets.map(({ path }) => path),
    typescript
  )
  const program = typescript.createProgram({
    rootNames: files,
    options: {
      ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
      noEmit: true,
    },
  })

  return {
    diagnostics: typescript.getPreEmitDiagnostics(program),
  }
}

const selectProjectGraph = (
  projects: ReadonlyArray<PreparedProject>,
  configFileNames: ReadonlyArray<string>,
  typescript: typeof TypeScriptRuntime
): SelectedProjectGraph => {
  const projectsByConfig = new Map(
    projects.map(
      (project) => [toCanonicalPath(project.configFileName, typescript), project] as const
    )
  )
  const selected: Array<PreparedProject> = []
  const missingConfigPaths: Array<string> = []
  const pending = [...configFileNames]
  const visited = new Set<string>()

  while (pending.length > 0) {
    const configFileName = pending.shift()

    if (!configFileName) {
      continue
    }

    const canonicalConfigFileName = toCanonicalPath(configFileName, typescript)

    if (visited.has(canonicalConfigFileName)) {
      continue
    }

    visited.add(canonicalConfigFileName)

    const project = projectsByConfig.get(canonicalConfigFileName)

    if (!project) {
      missingConfigPaths.push(configFileName)

      continue
    }

    selected.push(project)
    pending.push(
      ...(project.commandLine?.projectReferences?.map((reference) =>
        typescript.resolveProjectReferencePath(reference)) ?? [])
    )
  }

  return {
    missingConfigPaths: uniquePaths(missingConfigPaths, typescript),
    projects: selected,
  }
}

const checkConfiguredProjects = (
  projects: ReadonlyArray<PreparedProject>,
  typescript: typeof TypeScriptRuntime
): CheckedProject => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []

  projects.forEach((project) => {
    if (!project.commandLine || !project.program) {
      diagnostics.push(...project.diagnostics)

      return
    }

    diagnostics.push(...typescript.getPreEmitDiagnostics(project.program))
  })

  return {
    diagnostics,
  }
}

const toCheckedResult = (
  checked: CheckedProject,
  typescript: typeof TypeScriptRuntime
): TypecheckProjectCleanResult | TypecheckProjectDiagnosticsResult => {
  const diagnostics = typescript.sortAndDeduplicateDiagnostics([...checked.diagnostics])

  return diagnostics.length > 0
    ? {
        status: 'diagnostics',
        diagnostics,
        terminal: { exitCode: 1, reason: 'diagnostics' },
      }
    : {
        status: 'clean',
        diagnostics,
        terminal: { exitCode: 0, reason: 'clean' },
      }
}

export const typecheckProjectSources = async ({
  cwd,
  manifestPolicySources = [],
  rootCwd,
  targets = [],
}: TypecheckProjectInput): Promise<TypecheckProjectResult> => {
  try {
    const typescript = await importTypeScript()
    const projectCwd = resolveProjectCwd(cwd, rootCwd, typescript)
    const configFileName = join(projectCwd, PROJECT_CONFIG)
    const hasProject = typescript.sys.fileExists(configFileName)

    if (!hasProject && targets.length === 0) {
      return {
        status: 'missing-project',
        cwd: projectCwd,
        terminal: { exitCode: 1, reason: 'missing-project' },
      }
    }

    const policy = resolveTypecheckSkipLibCheck(
      manifestPolicySources,
      [rootCwd, projectCwd],
      typescript
    )

    if (typeof policy === 'object') {
      return policy
    }

    const typecheckSkipLibCheck = policy

    if (!hasProject) {
      return toCheckedResult(checkFiles(targets, typecheckSkipLibCheck, typescript), typescript)
    }

    const graph = parseProjectGraph(configFileName, typescript)

    if (graph.discoveryDiagnostics.length > 0) {
      return toCheckedResult({ diagnostics: graph.discoveryDiagnostics }, typescript)
    }

    const projects = graph.projects.map((project) =>
      prepareProject(project, typecheckSkipLibCheck, typescript))
    const selected =
      targets.length > 0
        ? resolveTargetProjects(projects, targets, typescript)
        : { configFileNames: [configFileName], unresolvedTargets: [] }

    if (selected.unresolvedTargets.length > 0) {
      return {
        status: 'unresolved-target',
        targets: selected.unresolvedTargets,
        terminal: { exitCode: 1, reason: 'unresolved-target' },
      }
    }

    const selectedGraph = selectProjectGraph(projects, selected.configFileNames, typescript)

    if (selectedGraph.missingConfigPaths.length > 0) {
      return {
        status: 'internal-failed',
        reason: 'incomplete-project-graph',
        missingConfigPaths: selectedGraph.missingConfigPaths,
        terminal: { exitCode: 1, reason: 'incomplete-project-graph' },
      }
    }

    return toCheckedResult(checkConfiguredProjects(selectedGraph.projects, typescript), typescript)
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
