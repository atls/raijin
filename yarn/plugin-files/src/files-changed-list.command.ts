import { BaseCommand }            from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Command }                from 'clipanion'

import { getChangedFiles }        from './changed-files.util'

class FilesChangedListCommand extends BaseCommand {
  @Command.Boolean('--json')
  public json = false

  @Command.Path('files', 'changed', 'list')
  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
    }

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      // eslint-disable-next-line no-shadow
      async (report) => {
        const files = await getChangedFiles(project)

        // eslint-disable-next-line no-restricted-syntax
        for (const file of files) {
          report.reportInfo(null, file)
          report.reportJson({
            location: file,
          })
        }
      }
    )

    return report.exitCode()
  }
}

export { FilesChangedListCommand }