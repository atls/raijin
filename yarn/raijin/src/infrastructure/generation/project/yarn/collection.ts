import type { Configuration }            from '@yarnpkg/core'
import type { FetchResult }              from '@yarnpkg/core'
import type { Locator }                  from '@yarnpkg/core'
import type { LocatorHash }              from '@yarnpkg/core'
import type { Project }                  from '@yarnpkg/core'
import type { FakeFS }                   from '@yarnpkg/fslib'
import type { PortablePath }             from '@yarnpkg/fslib'

import type { RaijinGenerationManifest } from '../github/generated-workflow-policy.js'

import { Cache }                         from '@yarnpkg/core'
import { ThrowReport }                   from '@yarnpkg/core'
import { Filename }                      from '@yarnpkg/fslib'
import { structUtils }                   from '@yarnpkg/core'
import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'
import { xfs }                           from '@yarnpkg/fslib'

type InstalledRaijinManifest = RaijinGenerationManifest & {
  schematics?: unknown
}

type ProjectCollectionSource = {
  collectionRoot: PortablePath
  manifest: InstalledRaijinManifest
  packageFs: FakeFS<PortablePath>
}

type MaterializedProjectCollection = {
  collectionPath: string
  manifest: InstalledRaijinManifest
}

const RAIJIN_IDENT = structUtils.parseIdent('@atls/raijin')

const projectCollectionUnavailable = (reason: string, cause?: unknown): Error =>
  new Error(`Installed @atls/raijin project collection is unavailable: ${reason}`, { cause })

const resolveRaijinLocator = (project: Project): Locator => {
  const locator = Array.from(project.storedPackages.values()).find(
    (candidate) =>
      !structUtils.isVirtualLocator(candidate) &&
      structUtils.areIdentsEqual(candidate, RAIJIN_IDENT)
  )

  if (!locator) {
    throw projectCollectionUnavailable('package resolution is missing')
  }

  return locator
}

export const readProjectCollectionSource = async ({
  packageFs,
  prefixPath,
}: FetchResult): Promise<ProjectCollectionSource> => {
  const manifestPath = ppath.join(prefixPath, Filename.manifest)
  let manifest: InstalledRaijinManifest

  try {
    manifest = JSON.parse(
      await packageFs.readFilePromise(manifestPath, 'utf8')
    ) as InstalledRaijinManifest
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

export const materializeProjectCollection = async <T>(
  source: ProjectCollectionSource,
  callback: (collection: MaterializedProjectCollection) => Promise<T>
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

export const withInstalledProjectCollection = async <T>(
  { configuration, project }: { configuration: Configuration; project: Project },
  callback: (collection: MaterializedProjectCollection) => Promise<T>
): Promise<T> => {
  await project.restoreInstallState()

  const locator = resolveRaijinLocator(project)
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
    const source = await readProjectCollectionSource(fetchResult)

    return await materializeProjectCollection(source, callback)
  } finally {
    fetchResult.releaseFs?.()
  }
}
