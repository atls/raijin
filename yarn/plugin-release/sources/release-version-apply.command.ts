import { appendFile }                  from 'node:fs/promises'

import { BaseCommand }                 from '@yarnpkg/cli'
import { WorkspaceRequiredError }      from '@yarnpkg/cli'
import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'
import { StreamReport }                from '@yarnpkg/core'
import { Option }                      from 'clipanion'

import { getDeferredReleaseDecisions } from './release-version.utils.js'
import { isDeferredReleaseRequired }   from './release-version.utils.js'

const GITHUB_OUTPUT_PATH = 'GITHUB_OUTPUT'

const writeGitHubOutput = async (name: string, value: string): Promise<void> => {
  const outputPath = process.env[GITHUB_OUTPUT_PATH]

  if (!outputPath) {
    return
  }

  await appendFile(outputPath, `${name}=${value}\n`)
}

export class ReleaseVersionApplyCommand extends BaseCommand {
  static override paths = [['release', 'version', 'apply']]

  workspaceIdent = Option.String('--workspace', { required: true })

  githubOutput = Option.String('--github-output')

  since = Option.String('--since')

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    const deferArgs = ['release', 'version', 'defer']

    if (this.since) {
      deferArgs.push('--since', this.since)
    }

    const deferCode = await this.cli.run(deferArgs, {
      cwd: project.cwd,
    })

    if (deferCode > 0) {
      return deferCode
    }

    const decisions = await getDeferredReleaseDecisions(configuration)
    const releaseRequired = isDeferredReleaseRequired(decisions, this.workspaceIdent)

    if (this.githubOutput) {
      await writeGitHubOutput(this.githubOutput, releaseRequired ? 'true' : 'false')
    }

    if (!releaseRequired) {
      const commandReport = await StreamReport.start(
        {
          stdout: this.context.stdout,
          configuration,
        },
        async (report) => {
          report.reportInfo(null, `No release target for ${this.workspaceIdent}`)
        }
      )

      return commandReport.exitCode()
    }

    return this.cli.run(['version', 'apply', '--all'], {
      cwd: project.cwd,
    })
  }
}
