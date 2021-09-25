import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class NodeStartBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    const entry = ctx.plan.getEntry('node-start')

    if (entry) {
      const entrypoint = entry.metadata.entrypoint || 'dist/index.js'

      ctx.addWebProcess(['node', entrypoint])
    }
  }
}
