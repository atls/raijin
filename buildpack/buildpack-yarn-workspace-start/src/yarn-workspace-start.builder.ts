import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class YarnWorkspaceStartBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    const entry = ctx.plan.getEntry('yarn-workspace-start')
    const entrypoint = entry?.metadata?.entrypoint || 'dist/index.js'

    ctx.addWebProcess(['node', '-r', './.pnp.cjs', entrypoint])
  }
}
