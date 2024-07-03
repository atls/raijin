import { StreamReport }              from '@yarnpkg/core'
import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'

import { TesterWorker }              from '@atls/code-test-worker'

import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'
import { GitHubChecks }              from './github.checks.js'

class ChecksTestIntegrationCommand extends AbstractChecksTestCommand {
  static paths = [['checks', 'test', 'integration']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async () => {
        const checks = new GitHubChecks('Test:Integration')

        // @ts-expect-error any
        const { id: checkId } = await checks.start()

        try {
          const results = await new TesterWorker(project.cwd).run(this.context.cwd, 'integration')

          const annotations = this.formatResults(results, project.cwd)

          await checks.complete(checkId, {
            title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
            summary:
              annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
            annotations,
          })
        } catch (error) {
          await checks.failure({
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
