import { execUtils }    from '@yarnpkg/core'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { PortablePath } from '@yarnpkg/fslib'

import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class YarnWorkspaceServeBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    const entry = ctx.plan.getEntry('yarn-workspace-serve')

    if (entry) {
      const { workspace } = entry.metadata

      const cwd = process.cwd() as PortablePath

      const { stdout } = await execUtils.execvp('yarn', ['workspaces', 'list', '--json'], {
        cwd,
      })

      const target = stdout
        .split('\n')
        .map((line) => {
          try {
            return JSON.parse(line)
          } catch {
            return null
          }
        })
        .find((spec) => spec.name === workspace)

      if (target) {
        const distPath = ppath.join(cwd, target.location as PortablePath, 'dist' as PortablePath)
        const destination = await xfs.mktempPromise()

        // eslint-disable-next-line no-restricted-syntax
        for (const file of await xfs.readdirPromise(distPath)) {
          // eslint-disable-next-line no-await-in-loop
          await xfs.copyPromise(ppath.join(destination, file), ppath.join(distPath, file))
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const file of await xfs.readdirPromise(cwd)) {
          // eslint-disable-next-line no-await-in-loop
          await xfs.removePromise(ppath.join(cwd, file))
        }

        // eslint-disable-next-line no-restricted-syntax
        for (const file of await xfs.readdirPromise(destination)) {
          // eslint-disable-next-line no-await-in-loop
          await xfs.copyPromise(ppath.join(cwd, file), ppath.join(destination, file))
        }

        ctx.addWebProcess(['nginx', '-g', 'daemon off;'])
      }
    }
  }
}
