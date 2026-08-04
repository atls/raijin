import type { WorkspaceInvocation }    from '@atls/raijin/commands'

import { appendFile }                  from 'node:fs/promises'

import { BaseCommand }                 from '@yarnpkg/cli'
import { StreamReport }                from '@yarnpkg/core'
import { Option }                      from 'clipanion'

import { defineCommandInvocation }     from '@atls/raijin/commands'

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

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'apply deferred workspace versions',
  })

  workspaceIdent = Option.String('--workspace', {
    required: false,
  })

  githubOutput = Option.String('--github-output')

  since = Option.String('--since')

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { yarn } = invocation
    const { configuration } = yarn

    const deferArgs = ['release', 'version', 'defer']

    if (this.since) {
      deferArgs.push('--since', this.since)
    }

    const deferCode = await invocation.yarn.execute(deferArgs)

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

    return invocation.yarn.execute(['version', 'apply', '--all'])
  }
}
