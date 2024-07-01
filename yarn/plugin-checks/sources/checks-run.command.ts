import { BaseCommand }   from '@yarnpkg/cli'
import { StreamReport }  from '@yarnpkg/core'
import { Configuration } from '@yarnpkg/core'
import { MessageName }   from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { execUtils }     from '@yarnpkg/core'

class ChecksRunCommand extends BaseCommand {
  static paths = [['checks', 'run']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await Promise.all([
          this.runCheck(project.cwd, ['lint'], report),
          this.runCheck(project.cwd, ['typecheck'], report),
          this.runCheck(project.cwd, ['test', 'unit'], report),
          this.runCheck(project.cwd, ['test', 'integration'], report),
        ])

        await this.runCheck(project.cwd, ['release'], report)
      }
    )

    return commandReport.exitCode()
  }

  private async runCheck(cwd: string, args: Array<string>, report: StreamReport) {
    try {
      const { stdout, stderr } = await execUtils.execvp('yarn', ['checks', ...args], {
        // @ts-expect-error any
        cwd,
      })

      this.context.stdout.write(stdout || stderr)
    } catch (error: any) {
      report.reportError(MessageName.UNNAMED, `Run check ${args.join(' ')} error: ${error.message}`)
    }
  }
}

export { ChecksRunCommand }
