import type { Workspace }                           from '@yarnpkg/core'
import type { Filename }                            from '@yarnpkg/fslib'
import type { PortablePath }                        from '@yarnpkg/fslib'

import type { ReleaseVersionChange }                from './release-version-policy.utils.js'
import type { ReleaseVersionWorkspace }             from './release-version-policy.utils.js'
import type { ReleaseVersionWorkspaceOwner }        from './release-version-policy.utils.js'

import { BaseCommand }                              from '@yarnpkg/cli'
import { WorkspaceRequiredError }                   from '@yarnpkg/cli'
import { Configuration }                            from '@yarnpkg/core'
import { Project }                                  from '@yarnpkg/core'
import { StreamReport }                             from '@yarnpkg/core'
import { execUtils }                                from '@yarnpkg/core'
import { structUtils }                              from '@yarnpkg/core'
import { ppath }                                    from '@yarnpkg/fslib'
import { xfs }                                      from '@yarnpkg/fslib'
import { parseSyml }                                from '@yarnpkg/parsers'
import { Option }                                   from 'clipanion'

import { getChangedCommmits }                       from '@atls/yarn-plugin-files'

import { mergeReleaseVersionDeferredDecision }      from './release-version-policy.utils.js'
import { resolveReleaseVersionDeferredStrategy }    from './release-version-policy.utils.js'
import { resolveReleaseVersionWorkspaceStrategies } from './release-version-policy.utils.js'

type GitHubCommit = Awaited<ReturnType<typeof getChangedCommmits>>[number]
type GitHubCommitFile = NonNullable<GitHubCommit['data']['files']>[number]

const DEFAULT_GIT_BASE_REF = 'origin/HEAD'
const HEAD_REF = 'HEAD'
const DEFAULT_GIT_RANGE = `${DEFAULT_GIT_BASE_REF}..${HEAD_REF}`
const MISSING_DIRECTORY_ERROR_CODE = 'ENOENT'

const isErrorWithCode = (error: unknown, code: string): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  (error as { code?: unknown }).code === code

const toWorkspaceIdent = (workspace: Workspace): string | undefined =>
  workspace.manifest.name ? structUtils.stringifyIdent(workspace.manifest.name) : undefined

const isReleasedWorkspace = (workspace: Workspace): boolean =>
  workspace.manifest.raw.private !== true && Boolean(toWorkspaceIdent(workspace))

const toReleaseWorkspace = (workspace: Workspace): ReleaseVersionWorkspace | undefined => {
  const ident = toWorkspaceIdent(workspace)

  if (!ident || !isReleasedWorkspace(workspace)) {
    return undefined
  }

  return {
    ident,
    relativeCwd: workspace.relativeCwd,
  }
}

const toReleaseWorkspaceOwner = (workspace: Workspace): ReleaseVersionWorkspaceOwner => ({
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

const getReleaseVersionChanges = async (
  project: Project,
  gitRange?: string
): Promise<Array<ReleaseVersionChange>> => {
  if (gitRange === undefined && process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
    return getGitHubChanges()
  }

  return getLocalChanges(project, gitRange ?? DEFAULT_GIT_RANGE)
}

const getDeferredReleaseDecisions = async (
  configuration: Configuration
): Promise<Map<string, string>> => {
  const deferredVersionFolder = configuration.get('deferredVersionFolder') as PortablePath
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
    const versionData = parseSyml(versionContent) as {
      releases?: Record<string, unknown>
    }

    for (const [ident, decision] of Object.entries(versionData.releases ?? {})) {
      if (typeof decision !== 'string') {
        continue
      }

      decisions.set(ident, mergeReleaseVersionDeferredDecision(decisions.get(ident), decision))
    }
  }

  return decisions
}

export class ReleaseVersionDeferCommand extends BaseCommand {
  static override paths = [['release', 'version', 'defer']]

  since = Option.String('--since')

  dryRun = Option.Boolean('--dry-run', false)

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const workspaces = project.workspaces
          .map(toReleaseWorkspace)
          .filter((item): item is ReleaseVersionWorkspace => Boolean(item))
        const workspaceOwners = project.workspaces.map(toReleaseWorkspaceOwner)

        const changes = await getReleaseVersionChanges(project, this.since)
        const strategies = resolveReleaseVersionWorkspaceStrategies(
          workspaces,
          changes,
          workspaceOwners
        )

        if (!strategies.length) {
          report.reportInfo(null, 'No released workspaces need deferred version records')

          return
        }

        const deferredDecisions = await getDeferredReleaseDecisions(configuration)

        for (const { workspace: changedWorkspace, strategy } of strategies) {
          const effectiveStrategy = resolveReleaseVersionDeferredStrategy(
            deferredDecisions.get(changedWorkspace.ident),
            strategy
          )

          report.reportInfo(null, `Deferring ${changedWorkspace.ident} as ${effectiveStrategy}`)

          if (this.dryRun) {
            continue
          }

          // Deferred version records share the same `.yarn/versions` state.
          // eslint-disable-next-line no-await-in-loop
          const code = await this.cli.run(
            ['workspace', changedWorkspace.ident, 'version', effectiveStrategy, '--deferred'],
            {
              cwd: project.cwd,
            }
          )

          if (code > 0) {
            throw new Error(`Failed to defer ${changedWorkspace.ident} as ${strategy}`)
          }
        }
      }
    )

    return commandReport.exitCode()
  }
}
