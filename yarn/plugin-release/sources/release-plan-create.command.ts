import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'
import { Command }                from 'clipanion'
import { Option }                 from 'clipanion'

import { buildReleasePlan }       from './release-plan.utils.js'

export class ReleasePlanCreateCommand extends BaseCommand {
  static override paths = [['release', 'plan', 'create']]

  static override usage = Command.Usage({
    description: 'create a Raijin release workspace selection',
    details: `
      The release selection records changed workspaces and ownership metadata once,
      so later publish stages can route the same workspaces without recalculating changed workspaces.
      Target package versions remain owned by Yarn deferred versioning and are only validated here.
      Run it after yarn release version defer and before yarn version apply --all.
    `,
  })

  output = Option.String('-o,--output')

  since = Option.String('--since')

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    const plan = await buildReleasePlan(project, configuration, this.since)
    const content = `${JSON.stringify(plan, null, 2)}\n`

    if (!this.output) {
      this.context.stdout.write(content)

      return 0
    }

    const outputPath = ppath.resolve(project.cwd, this.output)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await xfs.mkdirpPromise(ppath.dirname(outputPath))
        await xfs.writeFilePromise(outputPath, content)
        report.reportInfo(null, `Release plan written to ${this.output}`)
      }
    )

    return commandReport.exitCode()
  }
}
