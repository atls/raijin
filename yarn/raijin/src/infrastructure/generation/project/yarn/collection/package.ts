import type { Descriptor }      from '@yarnpkg/core'
import type { FetchResult }     from '@yarnpkg/core'
import type { LocatorHash }     from '@yarnpkg/core'
import type { Project }         from '@yarnpkg/core'
import type { PortablePath }    from '@yarnpkg/fslib'

import type { PackageManifest } from './package.interfaces.js'
import type { PackageSource }   from './package.interfaces.js'
import type { YarnContext }     from './package.interfaces.js'

import { Cache }                from '@yarnpkg/core'
import { ThrowReport }          from '@yarnpkg/core'
import { structUtils }          from '@yarnpkg/core'
import { npath }                from '@yarnpkg/fslib'
import { ppath }                from '@yarnpkg/fslib'
import { xfs }                  from '@yarnpkg/fslib'

const RAIJIN_IDENT = structUtils.parseIdent('@atls/raijin')
const PACKAGE_MANIFEST = 'package.json' as PortablePath
const COLLECTION_MANIFEST = 'collection.json' as PortablePath

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export class CollectionUnavailableException extends Error {
  constructor(cause: unknown) {
    super(`Project collection is unavailable: ${getErrorMessage(cause)}`, { cause })
  }
}

export const withMaterializedCollection = async <T>(
  { packageCollectionPath, packageFs }: PackageSource,
  useCollection: (collectionPath: string) => Promise<T>
): Promise<T> =>
  xfs.mktempPromise(async (temporaryDirectory) => {
    const materializedCollection = ppath.join(
      temporaryDirectory,
      'project-collection' as PortablePath
    )

    try {
      await xfs.copyPromise(materializedCollection, packageCollectionPath, {
        baseFs: packageFs,
      })
    } catch (error) {
      throw new CollectionUnavailableException(error)
    }

    return useCollection(
      npath.fromPortablePath(ppath.join(materializedCollection, COLLECTION_MANIFEST))
    )
  })

const getRaijinDescriptor = (project: Project): Descriptor => {
  const descriptor = project.topLevelWorkspace.anchoredPackage.dependencies.get(
    RAIJIN_IDENT.identHash
  )

  if (!descriptor) {
    throw new Error('The project does not declare @atls/raijin as a direct dependency')
  }

  return descriptor
}

const readRaijinPackageManifest = async ({
  packageFs,
  prefixPath,
}: FetchResult): Promise<PackageManifest> => {
  const manifestPath = ppath.join(prefixPath, PACKAGE_MANIFEST)
  const manifest = JSON.parse(await packageFs.readFilePromise(manifestPath, 'utf8')) as unknown

  if (!manifest || typeof manifest !== 'object') {
    throw new Error('The installed @atls/raijin package manifest is invalid')
  }

  return manifest as PackageManifest
}

export const resolvePackageSource = async (fetched: FetchResult): Promise<PackageSource> => {
  const manifest = await readRaijinPackageManifest(fetched)

  if (typeof manifest.schematics !== 'string' || manifest.schematics.length === 0) {
    throw new Error('The installed @atls/raijin package does not declare schematics')
  }

  return {
    packageCollectionPath: ppath.dirname(
      ppath.join(fetched.prefixPath, manifest.schematics as PortablePath)
    ),
    packageFs: fetched.packageFs,
  }
}

const fetchPackage = async ({ configuration, project }: YarnContext): Promise<FetchResult> => {
  try {
    await project.restoreInstallState()

    const descriptor = getRaijinDescriptor(project)
    const locatorHash = project.storedResolutions.get(descriptor.descriptorHash)

    if (!locatorHash) {
      throw new Error('The installed @atls/raijin resolution is unavailable')
    }

    const pkg = project.storedPackages.get(locatorHash)

    if (!pkg) {
      throw new Error('The installed @atls/raijin package is unavailable')
    }

    const cache = await Cache.find(configuration, { immutable: true })
    const fetcher = configuration.makeFetcher()
    const checksums = new Map<LocatorHash, string | null>(project.storedChecksums)

    return await fetcher.fetch(pkg, {
      cache,
      checksums,
      fetcher,
      project,
      report: new ThrowReport(),
    })
  } catch (error) {
    throw new CollectionUnavailableException(error)
  }
}

export const withYarnCollection = async <T>(
  { configuration, project }: YarnContext,
  useCollection: (collectionPath: string) => Promise<T>
): Promise<T> => {
  const fetched = await fetchPackage({ configuration, project })

  try {
    const collectionSource = await resolvePackageSource(fetched)

    return await withMaterializedCollection(collectionSource, useCollection)
  } finally {
    fetched.releaseFs?.()
  }
}
