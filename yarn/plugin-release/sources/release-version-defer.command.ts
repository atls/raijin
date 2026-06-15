import { BaseCommand }                           from '@yarnpkg/cli'
import { WorkspaceRequiredError }                from '@yarnpkg/cli'
import { Configuration }                         from '@yarnpkg/core'
import { Project }                               from '@yarnpkg/core'
import { StreamReport }                          from '@yarnpkg/core'
import { Option }                                from 'clipanion'

import { getDeferredReleaseDecisions }           from './release-plan.utils.js'
import { getReleaseVersionChanges }              from './release-plan.utils.js'
import { resolveReleasePlanStrategies }          from './release-plan.utils.js'
import { resolveReleaseVersionDeferredStrategy } from './release-version-policy.utils.js'

export { isReleaseVersionWorkspace } from './release-plan.utils.js'
export { parseDeferredReleaseDecisions } from './release-plan.utils.js'
export { selectLocalCommitDiffParent } from './release-plan.utils.js'
export { toGitHubChange } from './release-plan.utils.js'

export class ReleaseVersionDeferCommand extends BaseCommand {
  static override paths = [['release', 'version', 'defer']]

  since = Option.String('--since')

  dryRun = Option.Boolean('--dry-run', false)

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) throw new WorkspaceRequiredError(project.cwd, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const changes = await getReleaseVersionChanges(project, this.since)
        const strategies = resolveReleasePlanStrategies(project, changes)

        if (!strategies.length) {
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
            throw new Error(`Failed to defer ${changedWorkspace.ident} as ${strategy}`)
          }
        }
      }
    )

    return commandReport.exitCode()
  }
}
