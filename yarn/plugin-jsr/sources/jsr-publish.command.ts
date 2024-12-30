import assert                     from 'node:assert/strict'
import { join }                   from 'node:path'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { xfs }                    from '@yarnpkg/fslib'

import { JSR }                    from '@atls/code-jsr'

// TODO: fix publish dependencies error
export class JsrPublishCommand extends BaseCommand {
  static override paths = [['jsr', 'publish']]

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
        await report.startTimerPromise('Publishing to JSR', async () => {
          const token = process.env.GITHUB_TOKEN

          assert.ok(token, 'GitHub Token is missing')

          const jsr = new JSR(this.context.cwd)

          const binFolder = await xfs.mktempPromise()

          await jsr.publish({
            pkgJsonPath: join(this.context.cwd, 'package.json'),
            canary: false,
            publishArgs: ['install'],
            binFolder,
          })
        })
      }
    )

    return commandReport.exitCode()
  }
}
