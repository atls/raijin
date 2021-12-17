import { BaseCommand }   from '@yarnpkg/cli'
import { StreamReport }  from '@yarnpkg/core'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Option }        from 'clipanion'

import type * as Runtime from '@atls/yarn-runtime'

class TestUnitCommand extends BaseCommand {
  static paths = [['test', 'unit']]

  updateSnapshot = Option.Boolean(`-u,--update-shapshot`, false)

  bail = Option.Boolean(`-b,--bail`, false)

  findRelatedTests = Option.Boolean(`--find-related-tests`, false)

  files: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const { Tester }: typeof Runtime = require('@atls/yarn-runtime') as typeof Runtime
    const tester = new Tester(project.cwd)

    const cwd = project.cwd
    const isWorkspace = this.context.cwd !== cwd

    const args: Array<string> = []

    if (isWorkspace) {
      const scope = this.context.cwd.replace(cwd, '')

      args.push(scope.startsWith('/') ? scope.substr(1) : scope)
    }

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        await tester.unit(
          {
            findRelatedTests: this.findRelatedTests,
            updateSnapshot: this.updateSnapshot,
            bail: this.bail,
          },
          args.concat(this.files)
        )
      }
    )

    return commandReport.exitCode()
  }
}

export { TestUnitCommand }
