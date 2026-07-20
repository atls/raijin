import type { Descriptor }                   from '@yarnpkg/core'
import type { FetchResult }                  from '@yarnpkg/core'
import type { LocatorHash }                  from '@yarnpkg/core'
import type { Project }                      from '@yarnpkg/core'
import type { PortablePath }                 from '@yarnpkg/fslib'

import type { ProjectCollectionSource }      from './yarn-project-collection.interfaces.js'
import type { YarnProjectCollectionContext } from './yarn-project-collection.interfaces.js'

import { Cache }                             from '@yarnpkg/core'
import { ThrowReport }                       from '@yarnpkg/core'
import { structUtils }                       from '@yarnpkg/core'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'
import { xfs }                               from '@yarnpkg/fslib'

import { ProjectCollectionUnavailableException } from './project-collection-unavailable.exception.js'

const RAIJIN_IDENT = structUtils.parseIdent('@atls/raijin')
const PROJECT_COLLECTION_PATH = 'dist/generation/project/collection' as PortablePath
const COLLECTION_MANIFEST = 'collection.json' as PortablePath

export const withMaterializedProjectCollection = async <T>(
  { packageCollectionPath, packageFs }: ProjectCollectionSource,
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
      throw new ProjectCollectionUnavailableException(error)
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

const fetchRaijinProjectCollectionPackage = async ({
  configuration,
  project,
}: YarnProjectCollectionContext): Promise<FetchResult> => {
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
    throw new ProjectCollectionUnavailableException(error)
  }
}

export const withYarnProjectCollection = async <T>(
  { configuration, project }: YarnProjectCollectionContext,
  useCollection: (collectionPath: string) => Promise<T>
): Promise<T> => {
  const fetched = await fetchRaijinProjectCollectionPackage({ configuration, project })

  try {
    const packageCollectionPath = ppath.join(fetched.prefixPath, PROJECT_COLLECTION_PATH)

    return await withMaterializedProjectCollection(
      {
        packageCollectionPath,
        packageFs: fetched.packageFs,
      },
      useCollection
    )
  } finally {
    fetched.releaseFs?.()
  }
}
