import { StreamReport }              from '@yarnpkg/core'

import { Tester }                    from '@atls/code-test'
import { createCommandInput }        from '@atls/raijin/commands'

import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'
import { GitHubChecks }              from './github.checks.js'

export class ChecksTestUnitCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'unit']]

  static override usage = AbstractChecksTestCommand.Usage({
    description: 'report unit test results to GitHub Checks',
  })

  override async execute(): Promise<number> {
    const { invocation } = this.context

    if (!process.env.GITHUB_TOKEN) {
      return invocation.yarn.execute(['test', 'unit'])
    }

    const { executionCwd, yarn } = invocation
    const { configuration } = yarn

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        const checks = new GitHubChecks('Test:Unit')

        const { id: checkId } = await checks.start()

        try {
          const tester = await Tester.initialize(executionCwd)

          const results = await tester.unit(
            createCommandInput({ cwd: executionCwd, source: 'generated', targets: [] })
          )

          const annotations = this.formatResults(
            results.filter((result) => result.type === 'test:fail').map((result) => result.data),
            executionCwd,
            results
          )

          await checks.complete(checkId, {
            title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
            summary:
              annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
            annotations,
          })
        } catch (error) {
          await checks.failure(
            {
              title: 'Test:Unit run failed',
              summary: error instanceof Error ? error.message : (error as string),
            },
            checkId
          )
        }
      }
    )

    return commandReport.exitCode()
  }
}
