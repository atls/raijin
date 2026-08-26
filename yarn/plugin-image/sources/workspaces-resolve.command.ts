import type { ProjectCommandContext }              from '@atls/raijin/commands'
import type { Workspace }                          from '@yarnpkg/core'

import { BaseCommand }                             from '@yarnpkg/cli'
import { MessageName }                             from '@yarnpkg/core'
import { StreamReport }                            from '@yarnpkg/core'
import { Option }                                  from 'clipanion'

import { NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC } from './workspace-eligibility.js'
import { resolveWorkspaceEligibility }             from './workspace-eligibility.js'

class WorkspacesResolveCommand extends BaseCommand {
  static override paths = [['image', 'workspaces', 'resolve']]

  static override usage = BaseCommand.Usage({
    description: 'resolve selected workspaces eligible for image publication',
  })

  json = Option.Boolean('--json', false)

  locations: Array<string> = Option.Rest({ required: 0 })

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { yarn } = this.context.invocation
    const { configuration, project } = yarn
    const workspacesByLocation = new Map<string, Workspace>(
      project.workspaces.map((workspace) => [workspace.relativeCwd, workspace])
    )
    const missingLocations: Array<string> = []
    const selectedWorkspaces: Array<Workspace> = []
    const visitedLocations = new Set<string>()

    for (const location of this.locations) {
      if (visitedLocations.has(location)) {
        continue
      }

      visitedLocations.add(location)

      const workspace = workspacesByLocation.get(location)

      if (workspace) {
        selectedWorkspaces.push(workspace)
      } else {
        missingLocations.push(location)
      }
    }

    const result = resolveWorkspaceEligibility(selectedWorkspaces)
    const report = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (streamReport) => {
        if (missingLocations.length > 0) {
          streamReport.reportError(
            MessageName.UNNAMED,
            `Selected workspace locations not found: ${missingLocations.join(', ')}.`
          )

          return
        }

        if (!result) {
          streamReport.reportError(MessageName.UNNAMED, NO_ELIGIBLE_IMAGE_WORKSPACES_DIAGNOSTIC)

          return
        }

        for (const workspace of result.eligibleWorkspaces) {
          streamReport.reportInfo(null, workspace.location)
        }

        streamReport.reportJson(result)
      }
    )

    return report.exitCode()
  }
}

export { WorkspacesResolveCommand }
