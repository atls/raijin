/* Copy/Paste https://github.com/kherock/yarn-plugins/tree/main/packages/plugin-workspaces-export */
/* eslint-disable */

// @ts-nocheck

import { FetchOptions }        from '@yarnpkg/core'
import { FetchResult }         from '@yarnpkg/core'
import { Fetcher }             from '@yarnpkg/core'
import { Locator }             from '@yarnpkg/core'
import { MinimalFetchOptions } from '@yarnpkg/core'
import { Project }             from '@yarnpkg/core'
import { WorkspaceResolver }   from '@yarnpkg/core'
import { WorkspaceFetcher }    from '@yarnpkg/core/lib/WorkspaceFetcher.js'
import { PortablePath }        from '@yarnpkg/fslib'

import { genPackZip }          from './exportUtils.js'

/**
 * Fetcher that packs workspaces as cacheable packages
 */
export class WorkspacePackFetcher extends WorkspaceFetcher implements Fetcher {
  constructor(private originalProject: Project) {
    super()
  }

  getLocalPath(locator: Locator, opts: FetchOptions) {
    return super.getLocalPath(locator, this.rewriteOpts(locator, opts))
  }

  async fetch(locator: Locator, opts: FetchOptions) {
    if (locator.reference.slice(WorkspaceResolver.protocol.length) === `.`)
      return await super.fetch(locator, opts)

    const expectedChecksum = opts.checksums.get(locator.locatorHash) || null

    const [packageFs, releaseFs] = await opts.cache.fetchPackageFromCache(
      locator,
      expectedChecksum,
      {
        loader: () => this.packWorkspace(locator),
      }
    )

    return {
      packageFs,
      releaseFs,
      localPath: this.getLocalPath(locator, opts),
      prefixPath: PortablePath.dot,
    } as FetchResult as any
  }

  private async packWorkspace(locator: Locator) {
    const workspace = this.originalProject.getWorkspaceByLocator(locator)

    return await genPackZip(workspace, {
      compressionLevel: this.originalProject.configuration.get(`compressionLevel`),
      stripComponents: 1,
    })
  }

  private rewriteOpts<T extends MinimalFetchOptions>(locator: Locator, opts: T): T {
    // The root workspace should be resolved by the generated project
    return locator.reference.slice(WorkspaceResolver.protocol.length) === `.`
      ? opts
      : { ...opts, project: this.originalProject }
  }
}
