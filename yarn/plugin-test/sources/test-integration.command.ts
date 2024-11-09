import { join }                from 'node:path'

import { StreamReport }        from '@yarnpkg/core'
import { Configuration }       from '@yarnpkg/core'
import { Project }             from '@yarnpkg/core'

import { AbstractTestCommand } from './abstract-test.command.jsx'

class TestIntegrationCommand extends AbstractTestCommand {
  static paths = [['test', 'integration']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    const args: Array<string> = []

    if (workspace) {
      if (this.files?.length > 0) {
        const scope = this.context.cwd.replace(project.cwd, '')

        this.files.forEach((file) =>
          args.push(join(scope.startsWith('/') ? scope.slice(1) : scope, file)))
      } else {
        const scope = this.context.cwd.replace(project.cwd, '')

        args.push(scope.startsWith('/') ? scope.slice(1) : scope)
      }
    } else if (this.files?.length > 0) {
      this.files.forEach((file) => args.push(file))
    }

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        this.wrapOutput()

        await new TesterWorker(project.cwd).run(
          this.context.cwd,
          'integration',
          {
            findRelatedTests: this.findRelatedTests,
            updateSnapshot: this.updateSnapshot,
            bail: this.bail,
            watch: this.watchMode,
            watchAll: this.watchAllMode,
          },
          args
        )
      }
    )

    return commandReport.exitCode()
  }
}

export { TestIntegrationCommand }
