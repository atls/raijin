import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'
import { StreamReport }             from '@yarnpkg/core'
import { structUtils }              from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { defineCommandInvocation }  from '@atls/raijin/commands'
import { getChangedFiles }          from '@atls/yarn-plugin-files'

import { getChangedWorkspaces }     from './get-changed-workspaces.util.js'

class WorkspacesChangedListCommand extends BaseCommand {
  static override paths = [['workspaces', 'changed', 'list']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'list changed workspaces',
  })

  json = Option.Boolean('--json', false)

  async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { yarn } = invocation
    const { configuration, project } = yarn

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },

      async (streamReport) => {
        const files = await getChangedFiles(project)
        const workspaces = getChangedWorkspaces(project, files)

        for (const ws of workspaces) {
          streamReport.reportInfo(null, ws.relativeCwd)
          streamReport.reportJson({
            name: ws.manifest.name ? structUtils.stringifyIdent(ws.manifest.name) : null,
            location: ws.relativeCwd,
          })
        }
      }
    )

    return report.exitCode()
  }
}

export { WorkspacesChangedListCommand }
