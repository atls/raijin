import assert                     from 'node:assert/strict'
import { execSync }               from 'node:child_process'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'

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
  draft: boolean
  generate_release_notes: boolean
  make_latest: boolean
  name: string
  owner: string
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

export const createGitHubReleaseOptions = (
  packageName: string,
  version: string,
  owner: string,
  repo: string
): GitHubReleaseOptions => {
  const tagName = `${packageName}@${version}`

  return {
    draft: false,
    generate_release_notes: true,
    make_latest: true,
    name: tagName,
    owner,
    repo,
    tag_name: tagName,
  }
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
            const releaseOptions = createGitHubReleaseOptions(packageName, version, owner, repo)

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
