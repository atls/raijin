import { StreamReport }              from '@yarnpkg/core'

import { Tester }                    from '@atls/code-test'
import { createCommandInput }        from '@atls/raijin/commands'
import { proxyProjectCommand }       from '@atls/raijin/commands'
import { resolveProjectInvocation }  from '@atls/raijin/commands'
import { shouldProxyCommand }        from '@atls/raijin/commands'

import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'
import { GitHubChecks }              from './github.checks.js'

export class ChecksTestUnitCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'unit']]

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return proxyProjectCommand({
      args: ['checks', 'test', 'unit'],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    if (!process.env.GITHUB_TOKEN) {
      return this.cli.run(['test', 'unit'])
    }

    const { yarn } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const { configuration, project } = yarn

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        const checks = new GitHubChecks('Test:Unit')

        const { id: checkId } = await checks.start()

        try {
          const tester = await Tester.initialize(this.context.cwd)

          const results = await tester.unit(
            createCommandInput({ cwd: project.cwd, source: 'generated', targets: [] })
          )

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
