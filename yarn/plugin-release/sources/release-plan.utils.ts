import type { Workspace }                           from '@yarnpkg/core'
import type { Configuration }                       from '@yarnpkg/core'
import type { Project }                             from '@yarnpkg/core'
import type { Filename }                            from '@yarnpkg/fslib'
import type { PortablePath }                        from '@yarnpkg/fslib'

import type { ReleaseVersionChange }                from './release-version-policy.utils.js'
import type { ReleaseVersionWorkspace }             from './release-version-policy.utils.js'
import type { ReleaseVersionWorkspaceOwner }        from './release-version-policy.utils.js'
import type { ReleaseVersionWorkspaceStrategy }     from './release-version-policy.utils.js'

import { execUtils }                                from '@yarnpkg/core'
import { structUtils }                              from '@yarnpkg/core'
import { ppath }                                    from '@yarnpkg/fslib'
import { xfs }                                      from '@yarnpkg/fslib'
import { parseSyml }                                from '@yarnpkg/parsers'
import { versionUtils }                             from '@yarnpkg/plugin-version'

import { getChangedCommmits }                       from '@atls/yarn-plugin-files'

import { mergeReleaseVersionDeferredDecision }      from './release-version-policy.utils.js'
import { resolveReleaseVersionWorkspaceStrategies } from './release-version-policy.utils.js'

type GitHubCommit = Awaited<ReturnType<typeof getChangedCommmits>>[number]
type GitHubCommitFile = NonNullable<GitHubCommit['data']['files']>[number]

interface ReleaseVersionWorkspaceCandidate {
  relativeCwd: string
  manifest: Pick<Workspace['manifest'], 'name' | 'raw' | 'version'>
}

export interface ReleasePlanWorkspace {
  ident: string
  relativeCwd: string
  decision: ReleasePlanDecision
  private: boolean
}

export interface ReleasePlan {
  schemaVersion: typeof RELEASE_PLAN_SCHEMA_VERSION
  workspaces: Array<ReleasePlanWorkspace>
}

export interface ReleasePlanTarget {
  workspace: ReleaseVersionWorkspace
  decision: ReleasePlanDecision
}

const DEFAULT_GIT_BASE_REF = 'origin/HEAD'
const HEAD_REF = 'HEAD'
const DEFAULT_GIT_RANGE = `${DEFAULT_GIT_BASE_REF}..${HEAD_REF}`
const MISSING_DIRECTORY_ERROR_CODE = 'ENOENT'
const DECLINE_DECISION = 'decline'

export const RELEASE_PLAN_SCHEMA_VERSION = 2

export type ReleasePlanDecision = 'decline' | 'release'

export const isReleasePlanDecision = (decision: unknown): decision is ReleasePlanDecision =>
  decision === 'release' || decision === 'decline'

const isErrorWithCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === code

const toWorkspaceIdent = (
  workspace: Pick<ReleaseVersionWorkspaceCandidate, 'manifest'>
): string | undefined =>
  workspace.manifest.name ? structUtils.stringifyIdent(workspace.manifest.name) : undefined

export const isReleaseVersionWorkspace = (workspace: ReleaseVersionWorkspaceCandidate): boolean =>
  workspace.relativeCwd !== '.' &&
  Boolean(workspace.manifest.version) &&
  Boolean(toWorkspaceIdent(workspace))

export const toReleaseWorkspace = (workspace: Workspace): ReleaseVersionWorkspace | undefined => {
  const ident = toWorkspaceIdent(workspace)

  if (!ident || !isReleaseVersionWorkspace(workspace)) {
    return undefined
  }

  return {
    ident,
    relativeCwd: workspace.relativeCwd,
  }
}

export const toReleaseWorkspaceOwner = (workspace: Workspace): ReleaseVersionWorkspaceOwner => ({
  relativeCwd: workspace.relativeCwd,
})

const toGitHubFileNames = (file: GitHubCommitFile): Array<string> =>
  [file.filename, file.previous_filename].filter((filename): filename is string =>
    Boolean(filename))

export const toGitHubChange = (commit: GitHubCommit): ReleaseVersionChange => ({
  message: commit.data.commit.message,
  files: [...new Set((commit.data.files ?? []).flatMap(toGitHubFileNames))],
})

const getGitHubChanges = async (): Promise<Array<ReleaseVersionChange>> =>
  (await getChangedCommmits()).map(toGitHubChange)

const getLocalCommitShas = async (project: Project, gitRange: string): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp('git', ['rev-list', '--reverse', gitRange], {
    cwd: project.cwd,
    strict: true,
  })

  return stdout.split(/\r?\n/).filter(Boolean)
}

const getLocalCommitMessage = async (project: Project, sha: string): Promise<string> => {
  const { stdout } = await execUtils.execvp(
    'git',
    ['show', '--format=%B', '--no-patch', '--max-count=1', sha],
    {
      cwd: project.cwd,
      strict: true,
    }
  )

  return stdout
}

const getLocalCommitParentShas = async (project: Project, sha: string): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp('git', ['rev-list', '--parents', '-n', '1', sha], {
    cwd: project.cwd,
    strict: true,
  })

  const [, ...parents] = stdout.trim().split(' ').filter(Boolean)

  return parents
}

export const selectLocalCommitDiffParent = (
  parents: ReadonlyArray<string>,
  rangeShas: ReadonlySet<string>
): string | undefined => parents.find((parent) => !rangeShas.has(parent)) ?? parents[0]

const getLocalRootCommitFiles = async (project: Project, sha: string): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp(
    'git',
    ['diff-tree', '--no-commit-id', '--name-only', '-r', '--root', '--no-renames', '-z', sha],
    {
      cwd: project.cwd,
      strict: true,
    }
  )

  return stdout
    .split('\0')
    .map((file) => file.trim())
    .filter(Boolean)
}

const getLocalCommitFiles = async (
  project: Project,
  sha: string,
  rangeShas: ReadonlySet<string>
): Promise<Array<string>> => {
  const diffParent = selectLocalCommitDiffParent(
    await getLocalCommitParentShas(project, sha),
    rangeShas
  )

  if (!diffParent) {
    return getLocalRootCommitFiles(project, sha)
  }

  const { stdout } = await execUtils.execvp(
    'git',
    ['diff', '--name-only', '--no-renames', '-z', diffParent, sha],
    {
      cwd: project.cwd,
      strict: true,
    }
  )

  return [
    ...new Set(
      stdout
        .split('\0')
        .map((file) => file.trim())
        .filter(Boolean)
    ),
  ]
}

const getLocalCommitChange = async (
  project: Project,
  sha: string,
  rangeShas: ReadonlySet<string>
): Promise<ReleaseVersionChange> => ({
  message: await getLocalCommitMessage(project, sha),
  files: await getLocalCommitFiles(project, sha, rangeShas),
})

const getLocalChanges = async (
  project: Project,
  gitRange: string
): Promise<Array<ReleaseVersionChange>> => {
  const shas = await getLocalCommitShas(project, gitRange)
  const rangeShas = new Set(shas)

  return Promise.all(shas.map(async (sha) => getLocalCommitChange(project, sha, rangeShas)))
}

export const getReleaseVersionChanges = async (
  project: Project,
  gitRange?: string
): Promise<Array<ReleaseVersionChange>> => {
  if (gitRange === undefined && process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
    return getGitHubChanges()
  }

  return getLocalChanges(project, gitRange ?? DEFAULT_GIT_RANGE)
}

export const parseDeferredReleaseDecisions = (versionContent: string): Map<string, string> => {
  const versionData = parseSyml(versionContent) as {
    releases?: Record<string, unknown>
    declined?: Array<unknown>
  }
  const decisions = new Map<string, string>()

  for (const ident of versionData.declined ?? []) {
    if (typeof ident !== 'string') {
      continue
    }

    decisions.set(
      ident,
      mergeReleaseVersionDeferredDecision(decisions.get(ident), DECLINE_DECISION)
    )
  }

  for (const [ident, decision] of Object.entries(versionData.releases ?? {})) {
    if (typeof decision !== 'string') {
      continue
    }

    decisions.set(ident, mergeReleaseVersionDeferredDecision(decisions.get(ident), decision))
  }

  return decisions
}

export const getDeferredReleaseDecisions = async (
  configuration: Configuration
): Promise<Map<string, string>> => {
  const deferredVersionFolder = configuration.get('deferredVersionFolder')
  const decisions = new Map<string, string>()
  let entries: Array<Filename>

  try {
    entries = await xfs.readdirPromise(deferredVersionFolder)
  } catch (error) {
    if (isErrorWithCode(error, MISSING_DIRECTORY_ERROR_CODE)) {
      return decisions
    }

    throw error
  }

  for (const entry of entries) {
    if (!entry.endsWith('.yml')) {
      continue
    }

    const versionPath = ppath.join(deferredVersionFolder, entry)
    // eslint-disable-next-line no-await-in-loop
    const versionContent = await xfs.readFilePromise(versionPath, 'utf8')
    const versionDecisions = parseDeferredReleaseDecisions(versionContent)

    for (const [ident, decision] of versionDecisions) {
      decisions.set(ident, mergeReleaseVersionDeferredDecision(decisions.get(ident), decision))
    }
  }

  return decisions
}

export const getDeferredReleaseDeclinedIdents = async (
  configuration: Configuration
): Promise<Set<string>> => {
  const decisions = await getDeferredReleaseDecisions(configuration)

  return new Set(
    [...decisions.entries()]
      .filter(([, decision]) => decision === DECLINE_DECISION)
      .map(([ident]) => ident)
  )
}

const toPlanWorkspace = (project: Project, target: ReleasePlanTarget): ReleasePlanWorkspace => {
  const workspaceCwd = ppath.resolve(project.cwd, target.workspace.relativeCwd as PortablePath)
  const workspace = project.workspacesByCwd.get(workspaceCwd)

  if (!workspace) {
    throw new Error(`Could not resolve release workspace "${target.workspace.ident}"`)
  }

  return {
    ident: target.workspace.ident,
    relativeCwd: target.workspace.relativeCwd,
    decision: target.decision,
    private: workspace.manifest.private,
  }
}

const toDeclinedReleasePlanTarget = (workspace: Workspace): ReleasePlanTarget | undefined => {
  const releaseWorkspace = toReleaseWorkspace(workspace)
  const { version } = workspace.manifest

  if (!releaseWorkspace || !version) {
    return undefined
  }

  return {
    workspace: releaseWorkspace,
    decision: 'decline',
  }
}

const addDeclinedReleasePlanTargets = (
  project: Project,
  targets: Map<string, ReleasePlanTarget>,
  declinedIdents: ReadonlySet<string>
): void => {
  for (const workspace of project.workspaces) {
    const target = toDeclinedReleasePlanTarget(workspace)

    if (
      !target ||
      !declinedIdents.has(target.workspace.ident) ||
      targets.has(target.workspace.ident)
    ) {
      continue
    }

    targets.set(target.workspace.ident, target)
  }
}

export const resolveReleasePlanTargets = async (
  project: Project,
  declinedIdents: ReadonlySet<string> = new Set()
): Promise<Map<string, ReleasePlanTarget>> => {
  const versions = await versionUtils.resolveVersionFiles(project)
  const targets = new Map<string, ReleasePlanTarget>()

  for (const [workspace, version] of versions) {
    const releaseWorkspace = toReleaseWorkspace(workspace)

    if (!releaseWorkspace || !version) {
      continue
    }

    targets.set(releaseWorkspace.ident, {
      workspace: releaseWorkspace,
      decision: 'release',
    })
  }

  addDeclinedReleasePlanTargets(project, targets, declinedIdents)

  return targets
}

export const createReleasePlan = (
  project: Project,
  strategies: ReadonlyArray<ReleaseVersionWorkspaceStrategy>,
  targets: ReadonlyMap<string, ReleasePlanTarget>
): ReleasePlan => {
  for (const strategy of strategies) {
    if (!targets.has(strategy.workspace.ident)) {
      throw new Error(
        `Release plan requires deferred target version for "${strategy.workspace.ident}". ` +
          'Run `yarn release version defer` before `yarn release plan create`.'
      )
    }
  }

  return {
    schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
    workspaces: [...targets.values()]
      .sort((left, right) => left.workspace.relativeCwd.localeCompare(right.workspace.relativeCwd))
      .map((target) => toPlanWorkspace(project, target)),
  }
}

export const resolveReleasePlanStrategies = (
  project: Project,
  changes: ReadonlyArray<ReleaseVersionChange>
): Array<ReleaseVersionWorkspaceStrategy> => {
  const workspaces = project.workspaces
    .map(toReleaseWorkspace)
    .filter((item): item is ReleaseVersionWorkspace => Boolean(item))
  const workspaceOwners = project.workspaces.map(toReleaseWorkspaceOwner)

  return resolveReleaseVersionWorkspaceStrategies(workspaces, changes, workspaceOwners)
}

export const buildReleasePlan = async (
  project: Project,
  configuration: Configuration,
  gitRange?: string
): Promise<ReleasePlan> => {
  const changes = await getReleaseVersionChanges(project, gitRange)
  const strategies = resolveReleasePlanStrategies(project, changes)
  const declinedIdents = await getDeferredReleaseDeclinedIdents(configuration)
  const targets = await resolveReleasePlanTargets(project, declinedIdents)

  return createReleasePlan(project, strategies, targets)
}

const isReleasePlanWorkspace = (workspace: unknown): workspace is ReleasePlanWorkspace => {
  if (typeof workspace !== 'object' || workspace === null) {
    return false
  }

  const item = workspace as Partial<ReleasePlanWorkspace>

  return (
    typeof item.ident === 'string' &&
    typeof item.relativeCwd === 'string' &&
    isReleasePlanDecision(item.decision) &&
    typeof item.private === 'boolean'
  )
}

export const parseReleasePlan = (content: string): ReleasePlan => {
  const plan = JSON.parse(content) as Partial<ReleasePlan>

  if (
    plan.schemaVersion !== RELEASE_PLAN_SCHEMA_VERSION ||
    !Array.isArray(plan.workspaces) ||
    !plan.workspaces.every(isReleasePlanWorkspace)
  ) {
    throw new Error('Invalid release plan')
  }

  return {
    schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
    workspaces: plan.workspaces,
  }
}
