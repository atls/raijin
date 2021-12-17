import { StreamReport }              from '@yarnpkg/core'
import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'

import { Conclusion }                from '@atls/github-checks-utils'
import { createCheck }               from '@atls/github-checks-utils'
import type * as Runtime             from '@atls/yarn-runtime'

import { AbstractChecksTestCommand } from './abstract-checks-test.command'

class ChecksTestIntegrationCommand extends AbstractChecksTestCommand {
  static paths = [['checks', 'test', 'integration']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const { Tester }: typeof Runtime = require('@atls/yarn-runtime') as typeof Runtime
    const tester = new Tester(project.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        try {
          const results = await tester.integration()

          const annotations = this.formatResults(results, project.cwd)

          await createCheck(
            'Test:Integration',
            annotations.length > 0 ? Conclusion.Failure : Conclusion.Success,
            {
              title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
              summary:
                annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
              annotations,
            }
          )
        } catch (error) {
          await createCheck('Test:Integration', Conclusion.Failure, {
            title: 'Test:Integration run failed',
            summary: (error as any).message,
          })
        }
      }
    )

    return commandReport.exitCode()
  }
}

export { ChecksTestIntegrationCommand }
