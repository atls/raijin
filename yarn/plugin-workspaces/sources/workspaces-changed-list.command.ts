import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { StreamReport }             from '@yarnpkg/core'
import { structUtils }              from '@yarnpkg/core'
import { Option }                   from 'clipanion'

import { RaijinCommand }            from '@atls/raijin/commands'
import { getChangedFiles }          from '@atls/yarn-plugin-files'

import { getChangedWorkspaces }     from './get-changed-workspaces.util.js'

class WorkspacesChangedListCommand extends RaijinCommand {
  static override paths = [['workspaces', 'changed', 'list']]

  static override usage = RaijinCommand.Usage({
    description: 'list changed workspaces',
  })

  json = Option.Boolean('--json', false)

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
    const { yarn } = invocation
    const { configuration, project } = yarn

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },

      async (streamReport) => {
        const files = await getChangedFiles(invocation.child)
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
