import type { WorkspaceInvocation }               from '@atls/raijin/commands'

import { BaseCommand }                            from '@yarnpkg/cli'
import { StreamReport }                           from '@yarnpkg/core'
import { Option }                                 from 'clipanion'

import { defineCommandInvocation }                from '@atls/raijin/commands'

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

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'defer version bumps for changed workspaces',
  })

  since = Option.String('--since')

  dryRun = Option.Boolean('--dry-run', false)

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { yarn } = invocation
    const { configuration, project } = yarn

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
          const code = await invocation.yarn.execute(
            ['workspace', changedWorkspace.ident, 'version', effectiveStrategy, '--deferred'],
            {
              stdin: this.context.stdin,
              stdout: this.context.stdout,
              stderr: this.context.stderr,
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
          const code = await invocation.yarn.execute(
            ['workspace', changedWorkspace.ident, 'version', 'decline', '--deferred'],
            {
              stdin: this.context.stdin,
              stdout: this.context.stdout,
              stderr: this.context.stderr,
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
