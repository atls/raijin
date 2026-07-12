import { StreamReport }                    from '@yarnpkg/core'

import { Tester }                          from '@atls/code-test'
import { executeProjectCommandProxy }      from '@atls/raijin/commands'
import { resolveProjectCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }       from '@atls/raijin/commands'

import { AbstractChecksTestCommand }       from './abstract-checks-test.command.js'
import { GitHubChecks }                    from './github.checks.js'

class ChecksTestIntegrationCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'integration']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return executeProjectCommandProxy({
      args: ['checks', 'test', 'integration'],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    if (!process.env.GITHUB_TOKEN) {
      return this.cli.run(['test', 'integration'])
    }

    const { configuration, project } = await resolveProjectCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        const checks = new GitHubChecks('Test:Integration')

        const { id: checkId } = await checks.start()

        try {
          const tester = await Tester.initialize(this.context.cwd)

          const results = await tester.integration(project.cwd)

          const annotations = this.formatResults(
            results.filter((result) => result.type === 'test:fail').map((result) => result.data),
            project.cwd,
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
              title: 'Test:Integration run failed',
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

export { ChecksTestIntegrationCommand }
