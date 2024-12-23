import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { Option }                 from 'clipanion'

import { Changelog }              from '@atls/code-changelog'

export class ChangelogGenerateCommand extends BaseCommand {
  static override paths = [['changelog', 'generate']]

  debug = Option.Boolean('--debug')

  tagPrefix = Option.String('-t,--tag-prefix')

  stdOut = Option.Boolean('--stdout', false)

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    let result

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Generating changelog', async () => {
          let packageName = ''

          if (workspace.manifest.name?.scope) {
            packageName += `@${workspace.manifest.name?.scope}/`
          }
          packageName += `${workspace.manifest.name?.name}`

          const path = this.context.cwd

          const changelog = new Changelog()

          result = await changelog.generate({
            path,
            packageName,
            debug: this.debug,
            file: !this.stdOut,
            tagPrefix: this.tagPrefix,
          })
        })
      }
    )

    console.debug(result)

    return commandReport.exitCode()
  }
}
