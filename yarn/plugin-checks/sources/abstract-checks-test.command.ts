import type { ProjectCommandContext } from '@atls/raijin/commands'
import type { TestScenario }          from '@atls/yarn-plugin-test'
import type { EventData }             from 'node:test'

import type { Annotation }            from './github.checks.js'

import { BaseCommand }                from '@yarnpkg/cli'
import { MessageName }                from '@yarnpkg/core'
import { StreamReport }               from '@yarnpkg/core'

import { createCommandInput }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'
import { testProject }                from '@atls/yarn-plugin-test'

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

        const result = await testProject({
          rootCwd: toNativeCwd(invocation.project.cwd),
          cwd: nativeExecutionCwd,
          input: createCommandInput({
            cwd: invocation.executionCwd,
            source: 'generated',
            targets: [],
          }),
          reporter: 'silent',
          scenario,
        })
        const annotations =
          result.status === 'completed'
            ? this.formatResults(result.failures, nativeExecutionCwd, result.stderr)
            : []
        let summary = 'Node test summary reported failure'

        if (result.status === 'provider-failed') {
          summary = result.failure.message
        } else if (result.failures.length > 0) {
          summary = `Found ${result.failures.length} test failures`
        }

        try {
          if (result.terminal.exitCode === 0) {
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
              summary,
              annotations,
            },
            checkId
          )
          report.reportError(MessageName.UNNAMED, summary)
        } catch (error) {
          const failureSummary = error instanceof Error ? error.message : String(error)

          await checks.failure(
            {
              title: `${name} run failed`,
              summary: failureSummary,
            },
            checkId
          )
          report.reportError(MessageName.UNNAMED, failureSummary)
        }
      }
    )

    return commandReport.exitCode()
  }

  formatResults(
    results: ReadonlyArray<TestFail>,
    cwd: string,
    stderr: ReadonlyArray<EventData.TestStderr> = []
  ): Array<Annotation> {
    return formatTestResults(results, cwd, stderr)
  }
}
