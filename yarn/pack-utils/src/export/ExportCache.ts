/* Copy/Paste https://github.com/kherock/yarn-plugins/tree/main/packages/plugin-workspaces-export */
/* eslint-disable */

// @ts-nocheck

import { Cache }             from '@yarnpkg/core'
import { Configuration }     from '@yarnpkg/core'
import { Locator }           from '@yarnpkg/core'
import { LocatorHash }       from '@yarnpkg/core'
import { WorkspaceResolver } from '@yarnpkg/core'
import { FakeFS }            from '@yarnpkg/fslib'
import { JailFS }            from '@yarnpkg/fslib'
import { NodeFS }            from '@yarnpkg/fslib'
import { PortablePath }      from '@yarnpkg/fslib'
import { ZipFS }             from '@yarnpkg/fslib'
import { structUtils }       from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

export class ExportCache extends Cache {
  private nodeLinker: string
  private parentCache: Cache
  private parentMirror: Map<string, PortablePath> = new Map()
  private workspaceMutexes: Map<LocatorHash, Promise<PortablePath>> = new Map()

  static async find(configuration: Configuration, parentCache: Cache) {
    const nodeLinker = configuration.get(`nodeLinker`)
    const cache = new ExportCache(configuration.get(`cacheFolder`), {
      configuration,
      nodeLinker,
      parentCache,
    })
    await cache.setup()

    return cache
  }

  constructor(
    cacheCwd: PortablePath,
    {
      configuration,
      nodeLinker,
      parentCache,
    }: {
      configuration: Configuration
      nodeLinker: string
      parentCache: Cache
    }
  ) {
    super(cacheCwd, { configuration })
    this.nodeLinker = nodeLinker
    this.parentCache = parentCache
  }

  // get mirrorCwd() {
  //   return this.nodeLinker === `node-modules` ? null : this.parentCache.cwd;
  // }

  getLocatorMirrorPath(locator: Locator) {
    return this.parentMirror.get(structUtils.slugifyLocator(locator)) ?? null
  }

  async setup() {
    await super.setup()
    const directoryListing = await xfs.readdirPromise(this.parentCache.cwd, { withFileTypes: true })
    for (const entry of directoryListing) {
      let match: RegExpMatchArray | null
      if (entry.isDirectory() || !(match = entry.name.match(/^(.*)-[a-f\d]+\.zip$/i))) continue
      this.parentMirror.set(match[1], ppath.join(this.parentCache.cwd, entry.name))
    }
  }

  async fetchPackageFromCache(
    locator: Locator,
    expectedChecksum: string | null,
    { loader }: { loader?: () => Promise<ZipFS> }
  ): Promise<[FakeFS<PortablePath>, () => void, string]> {
    const baseFs = new NodeFS()

    const loadWorkspaceThroughMutex = async () => {
      const cachePath = ppath.resolve(
        this.cwd,
        `../workspaces` as PortablePath,
        structUtils.stringifyIdent(locator) as PortablePath
      )

      const mutexedLoad = async () => {
        const cacheExists = await baseFs.existsPromise(cachePath)

        if (!cacheExists) {
          const zipFs = await loader!()
          await baseFs.copyPromise(cachePath, PortablePath.root, { baseFs: zipFs })
          zipFs.discardAndClose()
        }
        return cachePath
      }

      const mutex = mutexedLoad()
      this.workspaceMutexes.set(locator.locatorHash, mutex)

      try {
        return await mutex
      } finally {
        this.workspaceMutexes.delete(locator.locatorHash)
      }
    }

    if (!locator.reference.startsWith(WorkspaceResolver.protocol)) {
      return await super.fetchPackageFromCache(locator, expectedChecksum, { loader })
    } else {
      for (let mutex; (mutex = this.workspaceMutexes.get(locator.locatorHash)); ) await mutex

      const cachePath = await loadWorkspaceThroughMutex()

      return [new JailFS(cachePath, { baseFs }), () => {}, null as unknown as string]
    }
  }
}
