import type { WorkspaceCommandContext }           from '@atls/raijin/commands'

import { BaseCommand }                            from '@yarnpkg/cli'
import { StreamReport }                           from '@yarnpkg/core'
import { Option }                                 from 'clipanion'

import { resolveReleaseVersionDeferredStrategy }  from './release-version-policy.utils.js'
import { getDeferredReleaseDecisions }            from './release-version.utils.js'
import { getReleaseVersionChanges }               from './release-version.utils.js'
import { resolveReleaseVersionDeclineStrategies } from './release-version.utils.js'
import { resolveReleaseVersionStrategies }        from './release-version.utils.js'

export { isReleaseVersionWorkspace }     from './release-version.utils.js'
export { parseDeferredReleaseDecisions } from './release-version.utils.js'
export { selectLocalCommitDiffParent }   from './release-version.utils.js'

export class ReleaseVersionDeferCommand extends BaseCommand {
  static override paths = [['release', 'version', 'defer']]

  static override usage = BaseCommand.Usage({
    description: 'defer version bumps for changed workspaces',
  })

  since = Option.String('--since')

  dryRun = Option.Boolean('--dry-run', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { configuration, project } = yarn

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const changes = await getReleaseVersionChanges(invocation.process, this.since)
        const strategies = resolveReleaseVersionStrategies(project, changes)
        const declineStrategies = resolveReleaseVersionDeclineStrategies(project, changes)

        if (!strategies.length && !declineStrategies.length) {
          report.reportInfo(null, 'No released workspaces need deferred version records')

          return
        }

        const deferredDecisions = await getDeferredReleaseDecisions(configuration)

        await strategies.reduce<Promise<void>>(async (
          previous,
          { workspace: changedWorkspace, strategy }
        ) => {
          await previous

          const effectiveStrategy = resolveReleaseVersionDeferredStrategy(
            deferredDecisions.get(changedWorkspace.ident),
            strategy
          )

          report.reportInfo(null, `Deferring ${changedWorkspace.ident} as ${effectiveStrategy}`)

          if (this.dryRun) {
            return
          }

          const code = await invocation.yarn.execute([
            'workspace',
            changedWorkspace.ident,
            'version',
            effectiveStrategy,
            '--deferred',
          ])

          if (code > 0) {
            throw new Error(`Failed to defer ${changedWorkspace.ident} as ${effectiveStrategy}`)
          }
        }, Promise.resolve())

        await declineStrategies.reduce<Promise<void>>(async (
          previous,
          { workspace: changedWorkspace }
        ) => {
          await previous

          if (deferredDecisions.has(changedWorkspace.ident)) {
            return
          }

          report.reportInfo(null, `Declining ${changedWorkspace.ident}`)

          if (this.dryRun) {
            return
          }

          const code = await invocation.yarn.execute([
            'workspace',
            changedWorkspace.ident,
            'version',
            'decline',
            '--deferred',
          ])

          if (code > 0) {
            throw new Error(`Failed to decline ${changedWorkspace.ident}`)
          }
        }, Promise.resolve())
      }
    )

    return commandReport.exitCode()
  }
}
