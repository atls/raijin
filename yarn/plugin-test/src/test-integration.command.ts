import { join }          from 'node:path'

import { BaseCommand }   from '@yarnpkg/cli'
import { StreamReport }  from '@yarnpkg/core'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'

import { Option }        from 'clipanion'

import { TesterWorker }  from '@atls/code-test-worker'

class TestIntegrationCommand extends BaseCommand {
  static paths = [['test', 'integration']]

  bail = Option.Boolean('-b,--bail', false)

  updateSnapshot = Option.Boolean('-u,--update-shapshot', false)

  findRelatedTests = Option.Boolean('--find-related-tests', false)

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    const args: Array<string> = []

    if (workspace) {
      if (this.files?.length > 0) {
        const scope = this.context.cwd.replace(project.cwd, '')

        this.files.forEach((file) =>
          args.push(join(scope.startsWith('/') ? scope.substr(1) : scope, file)))
      } else {
        const scope = this.context.cwd.replace(project.cwd, '')

        args.push(scope.startsWith('/') ? scope.substr(1) : scope)
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
        await new TesterWorker(project.cwd).run(
          'integration',
          {
            findRelatedTests: this.findRelatedTests,
            updateSnapshot: this.updateSnapshot,
            bail: this.bail,
          },
          args
        )
      }
    )

    return commandReport.exitCode()
  }
}

export { TestIntegrationCommand }
