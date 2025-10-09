import type { PortablePath } from '@yarnpkg/fslib'

import { BaseCommand }       from '@yarnpkg/cli'
import { StreamReport }      from '@yarnpkg/core'
import { Configuration }     from '@yarnpkg/core'
import { MessageName }       from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { execUtils }         from '@yarnpkg/core'

class ChecksRunCommand extends BaseCommand {
  static override paths = [['checks', 'run']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await this.runCheck(project.cwd, ['typecheck'], report)
        await this.runCheck(project.cwd, ['lint'], report)

        await Promise.allSettled([
          this.runCheck(project.cwd, ['test', 'unit'], report),
          this.runCheck(project.cwd, ['test', 'integration'], report),
        ])

        await this.runCheck(project.cwd, ['release'], report)
      }
    )

    return commandReport.exitCode()
  }

  private async runCheck(
    cwd: PortablePath,
    args: Array<string>,
    report: StreamReport
  ): Promise<void> {
    try {
      const { stdout, stderr } = await execUtils.execvp('yarn', ['checks', ...args], {
        cwd,
      })

      this.context.stdout.write(stdout || stderr)
    } catch (error) {
      report.reportError(
        MessageName.UNNAMED,
        `Run check ${args.join(' ')} error: ${
          error instanceof Error ? error.message : (error as string)
        }`
      )
    }
  }
}

export { ChecksRunCommand }
