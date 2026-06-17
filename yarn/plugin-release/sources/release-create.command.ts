import assert                     from 'node:assert/strict'
import { execSync }               from 'node:child_process'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { execUtils }              from '@yarnpkg/core'

import { Release }                from '@atls/code-github'

import { parseGitHubUrl }         from './utils/parse-git-url.js'

const RELEASE_ALREADY_EXISTS_STATUS = 422
const RELEASE_ALREADY_EXISTS_RESOURCE = '"resource":"Release"'
const RELEASE_ALREADY_EXISTS_CODE = '"code":"already_exists"'
const RELEASE_ALREADY_EXISTS_FIELD = '"field":"tag_name"'

interface GitHubReleaseError {
  status?: number
  message?: string
}

interface GitHubReleaseOptions {
  body: string
  draft: boolean
  make_latest: boolean
  name: string
  owner: string
  repo: string
  tag_name: string
}

interface GitHubReleaseNotesOptions {
  owner: string
  previous_tag_name?: string
  repo: string
  tag_name: string
}

export const isReleaseAlreadyExistsError = (error: unknown): boolean => {
  const githubError = error as GitHubReleaseError

  return (
    githubError.status === RELEASE_ALREADY_EXISTS_STATUS &&
    typeof githubError.message === 'string' &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_RESOURCE) &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_CODE) &&
    githubError.message.includes(RELEASE_ALREADY_EXISTS_FIELD)
  )
}

export const createGitHubReleaseTagName = (packageName: string, version: string): string =>
  `${packageName}@${version}`

export const createGitHubReleaseOptions = (
  packageName: string,
  version: string,
  body: string,
  owner: string,
  repo: string
): GitHubReleaseOptions => {
  const tagName = createGitHubReleaseTagName(packageName, version)

  return {
    body,
    draft: false,
    make_latest: true,
    name: tagName,
    owner,
    repo,
    tag_name: tagName,
  }
}

export const createGitHubReleaseNotesOptions = (
  packageName: string,
  version: string,
  owner: string,
  repo: string,
  previousTagName?: string
): GitHubReleaseNotesOptions => {
  const options: GitHubReleaseNotesOptions = {
    owner,
    repo,
    tag_name: createGitHubReleaseTagName(packageName, version),
  }

  if (previousTagName) {
    options.previous_tag_name = previousTagName
  }

  return options
}

const parseVersionCore = (version: string): [number, number, number] | undefined => {
  const [withoutBuild] = version.split('+')
  const [versionCore] = withoutBuild.split('-')
  const versionParts = versionCore.split('.')

  if (versionParts.length !== 3) {
    return undefined
  }

  const parsedVersionParts = versionParts.map((part) => Number(part))

  if (!parsedVersionParts.every((part) => Number.isInteger(part) && part >= 0)) {
    return undefined
  }

  return [parsedVersionParts[0], parsedVersionParts[1], parsedVersionParts[2]]
}

const compareVersionCore = (leftVersion: string, rightVersion: string): number => {
  const leftCore = parseVersionCore(leftVersion)
  const rightCore = parseVersionCore(rightVersion)

  if (!leftCore || !rightCore) {
    return leftVersion.localeCompare(rightVersion)
  }

  for (const index of [0, 1, 2]) {
    const diff = leftCore[index] - rightCore[index]

    if (diff !== 0) {
      return diff
    }
  }

  return 0
}

export const parseGitHubReleaseTagVersion = (
  packageName: string,
  tagName: string
): string | undefined => {
  const tagPrefix = `${packageName}@`

  if (!tagName.startsWith(tagPrefix)) {
    return undefined
  }

  return tagName.slice(tagPrefix.length)
}

export const selectPreviousGitHubReleaseTagName = (
  packageName: string,
  version: string,
  tagNames: Array<string>
): string | undefined =>
  tagNames
    .map((tagName) => ({
      tagName,
      version: parseGitHubReleaseTagVersion(packageName, tagName),
    }))
    .filter((tag): tag is { tagName: string; version: string } => typeof tag.version === 'string')
    .filter((tag) => compareVersionCore(tag.version, version) < 0)
    .sort((leftTag, rightTag) => compareVersionCore(rightTag.version, leftTag.version))[0]?.tagName

export const getGitHubReleaseTagNames = async (
  project: Project,
  packageName: string
): Promise<Array<string>> => {
  const { stdout } = await execUtils.execvp('git', ['tag', '--list', `${packageName}@*`], {
    cwd: project.cwd,
    strict: true,
  })

  return stdout
    .split('\n')
    .map((tagName) => tagName.trim())
    .filter(Boolean)
}

export class ReleaseCreateCommand extends BaseCommand {
  static override paths = [['release', 'create']]

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
        await report.startTimerPromise('Creating release', async () => {
          const token = process.env.GITHUB_TOKEN

          assert.ok(token, 'GitHub Token is missing')

          let packageName = ''

          const scopeName = workspace.manifest.name?.scope

          if (scopeName) {
            packageName += `@${scopeName}/`
          }

          const workspaceName = workspace.manifest.name?.name
          assert.ok(workspaceName, 'Missing workspace name')
          const { version } = workspace.manifest
          assert.ok(version, 'Missing version')

          packageName += `${workspaceName}`

          const release = new Release({ token })

          let owner: string
          let repo: string
          try {
            ;({ repository: repo, organization: owner } = parseGitHubUrl(
              // eslint-disable-next-line n/no-sync
              execSync('git remote get-url origin', { encoding: 'utf-8' })
            ))
          } catch {
            ;[owner, repo] = process.env.GITHUB_REPOSITORY?.split('/') ?? ['', '']
          }

          assert.ok(owner, 'Could not get url of the repo')
          assert.ok(repo, 'Could not get url of the repo')

          try {
            const tagNames = await getGitHubReleaseTagNames(project, packageName)
            const previousTagName = selectPreviousGitHubReleaseTagName(
              packageName,
              version,
              tagNames
            )
            const releaseNotesOptions = createGitHubReleaseNotesOptions(
              packageName,
              version,
              owner,
              repo,
              previousTagName
            )
            const releaseNotes = await release.generateNotes(releaseNotesOptions)
            const releaseOptions = createGitHubReleaseOptions(
              packageName,
              version,
              releaseNotes,
              owner,
              repo
            )

            await release.create(releaseOptions)
          } catch (error) {
            if (isReleaseAlreadyExistsError(error)) {
              report.reportInfo(null, `Release ${packageName}@${version} already exists; skipping`)

              return
            }

            throw error
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
