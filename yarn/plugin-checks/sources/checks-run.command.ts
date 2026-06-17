import type { PortablePath }          from '@yarnpkg/fslib'

import { BaseCommand }                from '@yarnpkg/cli'
import { StreamReport }               from '@yarnpkg/core'
import { Configuration }              from '@yarnpkg/core'
import { MessageName }                from '@yarnpkg/core'
import { Project }                    from '@yarnpkg/core'
import { execUtils }                  from '@yarnpkg/core'
import { xfs }                        from '@yarnpkg/fslib'
import { Command }                    from 'clipanion'
import { Option }                     from 'clipanion'

import { makeCurrentYarnExecutable }  from '@atls/yarn-plugin-tools/current-yarn-executable'

import { resolveChecksReleaseConfig } from './checks-release.config.js'

class ChecksRunCommand extends BaseCommand {
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

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)
    const releaseConfig = resolveChecksReleaseConfig(project)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        if ((await this.runCheck(project, project.cwd, ['typecheck'], report)) !== 0) {
          return
        }

        if ((await this.runCheck(project, project.cwd, ['lint'], report)) !== 0) {
          return
        }

        const testResults = await Promise.all([
          this.runCheck(project, project.cwd, ['test', 'unit'], report),
          this.runCheck(project, project.cwd, ['test', 'integration'], report),
        ])

        if (testResults.some((code) => code !== 0)) {
          return
        }

        if (!this.noRelease && releaseConfig.enabled) {
          await this.runCheck(project, project.cwd, ['release'], report)
        }
      }
    )

    return commandReport.exitCode()
  }

  private async runCheck(
    project: Project,
    cwd: PortablePath,
    args: Array<string>,
    report: StreamReport
  ): Promise<number> {
    try {
      const shouldAppendChanged =
        this.changed &&
        (args[0] === 'lint' || args[0] === 'typecheck') &&
        !args.includes('--changed')
      const checkArgs = shouldAppendChanged ? [...args, '--changed'] : args
      const binFolder = await xfs.mktempPromise()
      const { executable, env } = await makeCurrentYarnExecutable({ binFolder, project })

      const { code } = await execUtils.pipevp(executable, ['checks', ...checkArgs], {
        cwd,
        env,
        stdin: this.context.stdin,
        stdout: this.context.stdout,
        stderr: this.context.stderr,
      })

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
