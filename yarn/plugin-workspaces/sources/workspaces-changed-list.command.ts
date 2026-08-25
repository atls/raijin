import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { MessageName }                  from '@yarnpkg/core'
import { StreamReport }                 from '@yarnpkg/core'
import { structUtils }                  from '@yarnpkg/core'
import { Option }                       from 'clipanion'

import { formatChangedStateManagedError } from '@atls/yarn-plugin-files'
import { resolveChangedProjectStateForEntrypoint } from '@atls/yarn-plugin-files'
import { resolveProjectWorkspaces }     from '@atls/yarn-plugin-files'

import { expandWorkspaceDependents }    from './expand-workspace-dependents.js'

class WorkspacesChangedListCommand extends BaseCommand {
  static override paths = [['workspaces', 'changed', 'list']]

  static override usage = BaseCommand.Usage({
    description: 'list changed workspaces',
  })

  json = Option.Boolean('--json', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { configuration, project } = yarn

    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },

      async (streamReport) => {
        const result = await resolveChangedProjectStateForEntrypoint({
          processInvocation: invocation.process,
          project,
          source: { kind: 'working-tree' },
        })

        if (result.kind === 'error') {
          streamReport.reportError(MessageName.UNNAMED, formatChangedStateManagedError(result))

          return
        }

        const state = expandWorkspaceDependents(project, result.state)
        const workspaces = resolveProjectWorkspaces(project, state.workspaces)

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
