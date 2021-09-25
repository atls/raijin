import { execUtils }    from '@yarnpkg/core'
import { createHash }   from 'crypto'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { PortablePath } from '@yarnpkg/fslib'
import YAML             from 'yaml'

import { Builder }      from '@atls/buildpack-core'
import { BuildContext } from '@atls/buildpack-core'
import { BuildResult }  from '@atls/buildpack-core'

export class YarnWorkspacePackBuilder implements Builder {
  async build(ctx: BuildContext): Promise<BuildResult> {
    const entry = ctx.plan.getEntry('yarn-workspace-pack')

    if (entry) {
      const { workspace } = entry.metadata

      const cwd = process.cwd() as PortablePath
      const project = await xfs.mktempPromise()

      // eslint-disable-next-line no-restricted-syntax
      for (const file of await xfs.readdirPromise(cwd)) {
        // eslint-disable-next-line no-await-in-loop
        await xfs.movePromise(ppath.join(cwd, file), ppath.join(project, file))
      }

      await execUtils.pipevp(
        'yarn',
        ['workspace', workspace, 'app', 'pack', 'source', '--destination', cwd],
        {
          cwd: project,
          env: process.env,
          stdin: process.stdin,
          stdout: process.stdout,
          stderr: process.stderr,
        }
      )

      const yarnLock = await xfs.readFilePromise(ppath.join(cwd, 'yarn.lock' as PortablePath))
      const yarnLockCheckSum = createHash('md5').update(yarnLock).digest('hex')

      const yarnCachePath = ppath.join(cwd, '.yarn/cache' as PortablePath)

      if (xfs.existsSync(yarnCachePath)) {
        const cacheLayer = ctx.layers.get('yarn-cache', true, true, true)

        if (yarnLockCheckSum !== cacheLayer.getMetadata('locksum')) {
          // eslint-disable-next-line no-restricted-syntax
          for (const file of await xfs.readdirPromise(yarnCachePath)) {
            // eslint-disable-next-line no-await-in-loop
            await xfs.copyPromise(
              ppath.join(cacheLayer.path as PortablePath, file),
              ppath.join(yarnCachePath, file)
            )
          }

          cacheLayer.setMetadata('locksum', yarnLockCheckSum.toString())
          cacheLayer.save()
        }

        await xfs.rmdirPromise(yarnCachePath, { recursive: true })

        const yarnrc = await xfs.readFilePromise(ppath.join(cwd, '.yarnrc.yml' as PortablePath))

        const yarnrcContent = YAML.parse(yarnrc.toString())

        await xfs.writeFilePromise(
          ppath.join(cwd, '.yarnrc.yml' as PortablePath),
          YAML.stringify({
            ...yarnrcContent,
            cacheFolder: ppath.relative(cwd, cacheLayer.path as PortablePath),
          })
        )
      }

      await xfs.rmdirPromise(project, { recursive: true })

      await execUtils.pipevp('yarn', ['install', '--immutable'], {
        cwd,
        stdin: process.stdin,
        stdout: process.stdout,
        stderr: process.stderr,
        env: process.env,
      })
    }
  }
}
