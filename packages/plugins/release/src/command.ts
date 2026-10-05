import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { Workspace }               from '@yarnpkg/core'

import type { VersionRecommendation }   from './recommend.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { structUtils }                  from '@yarnpkg/core'
import { npath }                        from '@yarnpkg/fslib'
import { versionUtils }                 from '@yarnpkg/plugin-version'
import { Option }                       from 'clipanion'

import { getExplicitVersionDecisions }  from './deferred-decisions.js'
import { recommendWorkspaceVersion }    from './recommend.js'

export class InferVersionsCommand extends BaseCommand {
  static override paths = [['release', 'version', 'infer']]

  static override usage = BaseCommand.Usage({
    description: 'infer missing Yarn version decisions from package commits',
  })

  declare context: WorkspaceCommandContext

  dryRun = Option.Boolean('--dry-run', false)

  override async execute(): Promise<number> {
    const { project } = this.context.invocation.yarn
    const root = npath.fromPortablePath(project.cwd)
    const explicit = await getExplicitVersionDecisions(
      project.configuration.get('deferredVersionFolder')
    )
    const inferred = new Map<Workspace, VersionRecommendation>()

    const candidates = project.workspaces.filter(
      (workspace) =>
        workspace !== project.topLevelWorkspace &&
        workspace.manifest.raw.private !== true &&
        workspace.manifest.name !== null &&
        !explicit.has(structUtils.stringifyIdent(workspace.manifest.name))
    )
    const recommendations = await Promise.all(
      candidates.map(async (workspace) => ({
        workspace,
        decision: await recommendWorkspaceVersion(root, workspace),
      }))
    )

    for (const { workspace, decision } of recommendations) {
      if (!decision) continue

      inferred.set(workspace, decision)
      this.context.stdout.write(
        `${structUtils.stringifyIdent(workspace.manifest.name!)}: ${decision}\n`
      )
    }

    if (inferred.size === 0) {
      this.context.stdout.write('No version decisions to infer\n')
      return 0
    }

    if (this.dryRun) {
      return 0
    }

    const versionFile = await versionUtils.openVersionFile(project, { allowEmpty: true })

    for (const [workspace, decision] of inferred) {
      versionFile.releases.set(workspace, decision)
    }

    await versionFile.saveAll()

    return 0
  }
}
