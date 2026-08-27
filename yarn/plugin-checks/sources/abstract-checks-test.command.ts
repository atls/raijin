import type { ProjectCommandContext } from '@atls/raijin/commands'
import type { ProjectTestEvent }      from '@atls/yarn-plugin-test'
import type { TestScenario }          from '@atls/yarn-plugin-test'
import type { EventData }             from 'node:test'

import type { Annotation }            from './github.checks.js'

import { BaseCommand }                from '@yarnpkg/cli'
import { MessageName }                from '@yarnpkg/core'
import { StreamReport }               from '@yarnpkg/core'

import { createCommandInput }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'
import { createProjectTestOutcome }   from '@atls/yarn-plugin-test'
import { executeProjectTests }        from '@atls/yarn-plugin-test'

import { GitHubChecks }               from './github.checks.js'
import { formatTestResults }          from './test-results.formatter.js'

type TestFail = EventData.TestFail

export abstract class AbstractChecksTestCommand extends BaseCommand {
  declare context: ProjectCommandContext

  async executeTestCheck(scenario: TestScenario, name: string): Promise<number> {
    const { invocation } = this.context

    if (!process.env.GITHUB_TOKEN) {
      return invocation.yarn.execute(['test', scenario])
    }

    const nativeExecutionCwd = toNativeCwd(invocation.executionCwd)
    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration: invocation.yarn.configuration,
      },
      async (report) => {
        const checks = new GitHubChecks(name)
        const { id: checkId } = await checks.start()

        const result = await executeProjectTests({
          input: createCommandInput({
            cwd: invocation.executionCwd,
            source: 'generated',
            targets: [],
          }),
          invocation,
          reporter: 'silent',
          scenario,
        })
        const outcome = createProjectTestOutcome(result)
        const annotations = this.formatResults(
          result.state.failures,
          nativeExecutionCwd,
          result.state.events
        )

        try {
          if (outcome.exitCode === 0) {
            await checks.complete(checkId, {
              title: 'Successful',
              summary: 'All checks passed',
              annotations,
            })

            return
          }

          await checks.failure(
            {
              title: `${name} run failed`,
              summary: outcome.summary,
              annotations,
            },
            checkId
          )
          report.reportError(MessageName.UNNAMED, outcome.summary)
        } catch (error) {
          const summary = error instanceof Error ? error.message : String(error)

          await checks.failure(
            {
              title: `${name} run failed`,
              summary,
            },
            checkId
          )
          report.reportError(MessageName.UNNAMED, summary)
        }
      }
    )

    return commandReport.exitCode()
  }

  formatResults(
    results: Array<TestFail>,
    cwd: string,
    events: Array<ProjectTestEvent> = []
  ): Array<Annotation> {
    return formatTestResults(results, cwd, events)
  }
}
