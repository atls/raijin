import { appendFile }                  from 'node:fs/promises'

import { BaseCommand }                 from '@yarnpkg/cli'
import { StreamReport }                from '@yarnpkg/core'
import { Option }                      from 'clipanion'

import { resolveWorkspaceInvocation }  from '@atls/raijin/commands'

import { getDeferredReleaseDecisions } from './release-version.utils.js'
import { isDeferredReleaseRequired }   from './release-version.utils.js'

const GITHUB_OUTPUT_PATH = 'GITHUB_OUTPUT'
const DEFAULT_WORKSPACE_IDENT = '@atls/raijin'

const writeGitHubOutput = async (name: string, value: string): Promise<void> => {
  const outputPath = process.env[GITHUB_OUTPUT_PATH]

  if (!outputPath) {
    return
  }

  await appendFile(outputPath, `${name}=${value}\n`)
}

export class ReleaseVersionApplyCommand extends BaseCommand {
  static override paths = [['release', 'version', 'apply']]

  workspaceIdent = Option.String('--workspace', {
    required: false,
  })

  githubOutput = Option.String('--github-output')

  since = Option.String('--since')

  override async execute(): Promise<number> {
    const { yarn } = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const { configuration, project } = yarn

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
    const workspaceIdent = this.workspaceIdent ?? DEFAULT_WORKSPACE_IDENT
    const releaseRequired = isDeferredReleaseRequired(decisions, workspaceIdent)

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
          report.reportInfo(null, `No release target for ${workspaceIdent}`)
        }
      )

      return commandReport.exitCode()
    }

    return this.cli.run(['version', 'apply', '--all'], {
      cwd: project.cwd,
    })
  }
}
