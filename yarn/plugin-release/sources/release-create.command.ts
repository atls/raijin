import assert                     from 'node:assert/strict'
import { execSync }               from 'node:child_process'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'

import { Changelog }              from '@atls/code-changelog'
import { Release }                from '@atls/code-github'

import { parseGitHubUrl }         from './utils/parse-git-url.js'

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

          const changelog = new Changelog()

          const body = await changelog.generate({
            packageName,
            version,
            path: this.context.cwd,
          })

          const release = new Release({ token })

          let owner = ''
          let repo = ''
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

          await release.create({
            draft: false,
            make_latest: true,
            name: `${packageName}@${version}`,
            tag_name: `${packageName}@${version}`,
            body,
            owner,
            repo,
          })
        })
      }
    )

    return commandReport.exitCode()
  }
}
