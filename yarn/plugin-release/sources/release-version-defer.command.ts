import { BaseCommand }                            from '@yarnpkg/cli'
import { StreamReport }                           from '@yarnpkg/core'
import { Option }                                 from 'clipanion'

import { resolveWorkspaceCommandInvocation }      from '@atls/raijin/commands'

import { resolveReleaseVersionDeferredStrategy }  from './release-version-policy.utils.js'
import { getDeferredReleaseDecisions }            from './release-version.utils.js'
import { getReleaseVersionChanges }               from './release-version.utils.js'
import { resolveReleaseVersionDeclineStrategies } from './release-version.utils.js'
import { resolveReleaseVersionStrategies }        from './release-version.utils.js'

export { isReleaseVersionWorkspace }     from './release-version.utils.js'
export { parseDeferredReleaseDecisions } from './release-version.utils.js'
export { selectLocalCommitDiffParent }   from './release-version.utils.js'
export { toGitHubChange }                from './release-version.utils.js'

export class ReleaseVersionDeferCommand extends BaseCommand {
  static override paths = [['release', 'version', 'defer']]

  since = Option.String('--since')

  dryRun = Option.Boolean('--dry-run', false)

  override async execute(): Promise<number> {
    const { configuration, project } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const changes = await getReleaseVersionChanges(project, this.since)
        const strategies = resolveReleaseVersionStrategies(project, changes)
        const declineStrategies = resolveReleaseVersionDeclineStrategies(project, changes)

        if (!strategies.length && !declineStrategies.length) {
          report.reportInfo(null, 'No released workspaces need deferred version records')

          return
        }

        const deferredDecisions = await getDeferredReleaseDecisions(configuration)

        for (const { workspace: changedWorkspace, strategy } of strategies) {
          const effectiveStrategy = resolveReleaseVersionDeferredStrategy(
            deferredDecisions.get(changedWorkspace.ident),
            strategy
          )

          report.reportInfo(null, `Deferring ${changedWorkspace.ident} as ${effectiveStrategy}`)

          if (this.dryRun) {
            continue
          }

          // Deferred version records share the same `.yarn/versions` state.
          // eslint-disable-next-line no-await-in-loop
          const code = await this.cli.run(
            ['workspace', changedWorkspace.ident, 'version', effectiveStrategy, '--deferred'],
            {
              cwd: project.cwd,
            }
          )

          if (code > 0) {
            throw new Error(`Failed to defer ${changedWorkspace.ident} as ${effectiveStrategy}`)
          }
        }

        for (const { workspace: changedWorkspace } of declineStrategies) {
          if (deferredDecisions.has(changedWorkspace.ident)) {
            continue
          }

          report.reportInfo(null, `Declining ${changedWorkspace.ident}`)

          if (this.dryRun) {
            continue
          }

          // Deferred version records share the same `.yarn/versions` state.
          // eslint-disable-next-line no-await-in-loop
          const code = await this.cli.run(
            ['workspace', changedWorkspace.ident, 'version', 'decline', '--deferred'],
            {
              cwd: project.cwd,
            }
          )

          if (code > 0) {
            throw new Error(`Failed to decline ${changedWorkspace.ident}`)
          }
        }
      }
    )

    return commandReport.exitCode()
  }
}
