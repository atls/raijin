import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { join }                         from 'node:path'

const PACKAGE_MANIFEST = 'package.json'
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

export type TypecheckProjectResult =
  | TypecheckProjectCleanResult
  | TypecheckProjectDiagnosticsResult
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
): boolean | undefined => {
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
    throw new TypeError(
      `typecheckSkipLibCheck in ${join(configured.cwd, PACKAGE_MANIFEST)} must be a boolean`
    )
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

  projects.forEach(({ configFileName, program }) => {
    if (!program) {
      return
    }

    const sourceFiles = new Set(
      program.getSourceFiles().map(({ fileName }) => toCanonicalPath(fileName, typescript))
    )
    const ownedTargetPaths = Array.from(targetPaths.keys()).filter((targetPath) =>
      sourceFiles.has(targetPath))

    ownedTargetPaths.forEach((targetPath) => resolvedTargets.add(targetPath))

    if (ownedTargetPaths.length > 0) {
      configFileNames.push(configFileName)
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
): Array<PreparedProject> => {
  const projectsByConfig = new Map(
    projects.map(
      (project) => [toCanonicalPath(project.configFileName, typescript), project] as const
    )
  )
  const selected: Array<PreparedProject> = []
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
      throw new Error(`TypeScript project graph is missing ${configFileName}`)
    }

    selected.push(project)
    pending.push(
      ...(project.commandLine?.projectReferences?.map((reference) =>
        typescript.resolveProjectReferencePath(reference)) ?? [])
    )
  }

  return selected
}

const getProjectGraphDiagnostics = (
  configFileNames: ReadonlyArray<string>,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []
  const host = typescript.createSolutionBuilderHost(
    typescript.sys,
    undefined,
    (diagnostic) => diagnostics.push(diagnostic),
    () => undefined
  )

  typescript.createSolutionBuilder(host, configFileNames, { dry: true }).clean()

  return typescript.sortAndDeduplicateDiagnostics(diagnostics)
}

const checkConfiguredProjects = (
  projects: ReadonlyArray<PreparedProject>,
  configFileNames: ReadonlyArray<string>,
  typescript: typeof TypeScriptRuntime
): CheckedProject => {
  const diagnostics: Array<TypeScriptRuntime.Diagnostic> = []

  selectProjectGraph(projects, configFileNames, typescript).forEach((project) => {
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

    const typecheckSkipLibCheck = resolveTypecheckSkipLibCheck(
      manifestPolicySources,
      [rootCwd, projectCwd],
      typescript
    )

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

    const graphDiagnostics = getProjectGraphDiagnostics(selected.configFileNames, typescript)
    const checked = checkConfiguredProjects(projects, selected.configFileNames, typescript)

    return toCheckedResult(
      { diagnostics: [...graphDiagnostics, ...checked.diagnostics] },
      typescript
    )
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
