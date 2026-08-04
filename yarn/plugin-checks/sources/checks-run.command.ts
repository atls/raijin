import type { ProjectInvocation }     from '@atls/raijin/commands'

import { StreamReport }               from '@yarnpkg/core'
import { MessageName }                from '@yarnpkg/core'
import { Command }                    from 'clipanion'
import { Option }                     from 'clipanion'

import { RaijinCommand }              from '@atls/raijin/commands'

import { resolveChecksReleaseConfig } from './checks-release.config.js'

class ChecksRunCommand extends RaijinCommand {
  static override paths = [['checks', 'run']]

  static override usage = Command.Usage({
    description: 'run the standard GitHub check sequence',
    details: `
      The standard sequence is typecheck, lint, unit tests, integration tests, then release.
      Use --no-release for private application pipelines that need the standard checks without the Release check.
      The same release step can be disabled from top-level package.json with tools.checks.release=false.
    `,
  })

  changed = Option.Boolean('--changed', false)

  noRelease = Option.Boolean('--no-release', false)

  async executeProject(invocation: ProjectInvocation): Promise<number> {
    const { configuration, project } = invocation.yarn
    const releaseConfig = resolveChecksReleaseConfig(project)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        if ((await this.runCheck(invocation, ['typecheck'], report)) !== 0) {
          return
        }

        if ((await this.runCheck(invocation, ['lint'], report)) !== 0) {
          return
        }

        const testResults = await Promise.all([
          this.runCheck(invocation, ['test', 'unit'], report),
          this.runCheck(invocation, ['test', 'integration'], report),
        ])

        if (testResults.some((code) => code !== 0)) {
          return
        }

        if (!this.noRelease && releaseConfig.enabled) {
          await this.runCheck(invocation, ['release'], report)
        }
      }
    )

    return commandReport.exitCode()
  }

  private async runCheck(
    invocation: ProjectInvocation,
    args: Array<string>,
    report: StreamReport
  ): Promise<number> {
    try {
      const shouldAppendChanged =
        this.changed &&
        (args[0] === 'lint' || args[0] === 'typecheck') &&
        !args.includes('--changed')
      const checkArgs = shouldAppendChanged ? [...args, '--changed'] : args
      const code = await invocation.yarn.execute(['checks', ...checkArgs])

      if (code !== 0) {
        report.reportError(MessageName.UNNAMED, `Run check ${args.join(' ')} failed: ${code}`)
      }

      return code
    } catch (error) {
      report.reportError(
        MessageName.UNNAMED,
        `Run check ${args.join(' ')} error: ${
          error instanceof Error ? error.message : (error as string)
        }`
      )

      return 1
    }
  }
}

export { ChecksRunCommand }
