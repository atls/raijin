import type { FetchResult }  from '@yarnpkg/core'
import type { Locator }      from '@yarnpkg/core'
import type { LocatorHash }  from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import type { Context }      from './package.interfaces.js'
import type { Materialized } from './package.interfaces.js'
import type { Manifest }     from './package.interfaces.js'
import type { Source }       from './package.interfaces.js'

import { Cache }             from '@yarnpkg/core'
import { ThrowReport }       from '@yarnpkg/core'
import { Filename }          from '@yarnpkg/fslib'
import { structUtils }       from '@yarnpkg/core'
import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

const RAIJIN_IDENT = structUtils.parseIdent('@atls/raijin')

const projectCollectionUnavailable = (reason: string, cause?: unknown): Error =>
  new Error(`Installed @atls/raijin project collection is unavailable: ${reason}`, { cause })

export const resolvePackage = ({
  project,
  workspace,
}: Pick<Context, 'project' | 'workspace'>): Locator => {
  const descriptor = workspace.anchoredPackage.dependencies.get(RAIJIN_IDENT.identHash)

  if (!descriptor) {
    throw projectCollectionUnavailable('invoking workspace does not declare the package')
  }

  const locatorHash = project.storedResolutions.get(descriptor.descriptorHash)

  if (!locatorHash) {
    throw projectCollectionUnavailable('workspace package resolution is missing')
  }

  const pkg = project.storedPackages.get(locatorHash)

  if (!pkg) {
    throw projectCollectionUnavailable('workspace package is missing')
  }

  return pkg
}

export const readSource = async ({ packageFs, prefixPath }: FetchResult): Promise<Source> => {
  const manifestPath = ppath.join(prefixPath, Filename.manifest)
  let manifest: Manifest

  try {
    manifest = JSON.parse(await packageFs.readFilePromise(manifestPath, 'utf8')) as Manifest
  } catch (error) {
    throw projectCollectionUnavailable('package metadata cannot be read', error)
  }

  if (typeof manifest.schematics !== 'string') {
    throw projectCollectionUnavailable('package metadata does not declare schematics')
  }

  const relativeCollectionPath = npath.toPortablePath(manifest.schematics)

  if (ppath.isAbsolute(relativeCollectionPath)) {
    throw projectCollectionUnavailable('schematics metadata must be package-relative')
  }

  const collectionPath = ppath.join(prefixPath, relativeCollectionPath)

  if (ppath.contains(prefixPath, collectionPath) === null) {
    throw projectCollectionUnavailable('schematics metadata escapes the package')
  }

  if (!(await packageFs.existsPromise(collectionPath))) {
    throw projectCollectionUnavailable('declared collection does not exist')
  }

  return {
    collectionRoot: ppath.dirname(collectionPath),
    manifest,
    packageFs,
  }
}

export const materialize = async <T>(
  source: Source,
  callback: (collection: Materialized) => Promise<T>
): Promise<T> =>
  xfs.mktempPromise(async (temporaryRoot) => {
    const materializedRoot = ppath.join(temporaryRoot, 'project-collection' as PortablePath)

    await xfs.copyPromise(materializedRoot, source.collectionRoot, { baseFs: source.packageFs })

    return callback({
      collectionPath: npath.fromPortablePath(
        ppath.join(materializedRoot, 'collection.json' as PortablePath)
      ),
      manifest: source.manifest,
    })
  })

export const withCollection = async <T>(
  { configuration, project, workspace }: Context,
  callback: (collection: Materialized) => Promise<T>
): Promise<T> => {
  await project.restoreInstallState()

  const locator = resolvePackage({ project, workspace })
  const fetcher = configuration.makeFetcher()
  const cache = await Cache.find(configuration)
  const checksums = new Map<LocatorHash, string | null>(project.storedChecksums)
  const fetchResult = await fetcher.fetch(locator, {
    cache,
    checksums,
    fetcher,
    project,
    report: new ThrowReport(),
  })

  try {
    const source = await readSource(fetchResult)

    return await materialize(source, callback)
  } finally {
    fetchResult.releaseFs?.()
  }
}
