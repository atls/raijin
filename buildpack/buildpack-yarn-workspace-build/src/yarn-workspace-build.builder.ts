import execa            from 'execa'

import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class YarnWorkspaceBuildBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    const entry = ctx.plan.getEntry('yarn-workspace-build')

    if (entry) {
      const { workspace } = entry.metadata

      await execa('yarn', ['workspace', workspace, 'build'], {
        stdio: 'inherit',
      })
    }
  }
}
