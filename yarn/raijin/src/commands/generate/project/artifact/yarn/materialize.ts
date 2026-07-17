import type { Descriptor }                        from '@yarnpkg/core'
import type { Package }                           from '@yarnpkg/core'

import type { ProjectGenerationArtifactConsumer } from './materialize.interfaces.js'
import type { YarnProjectContext }                from './materialize.interfaces.js'

import { Cache }                                  from '@yarnpkg/core'
import { Manifest }                               from '@yarnpkg/core'
import { ThrowReport }                            from '@yarnpkg/core'
import { structUtils }                            from '@yarnpkg/core'
import { ppath }                                  from '@yarnpkg/fslib'
import { xfs }                                    from '@yarnpkg/fslib'

import { assertProjectGenerationArtifact }        from '../contract.js'
import { resolveProjectCollectionPath }           from '../contract.js'

const RAIJIN_IDENT = structUtils.makeIdent('atls', 'raijin')
const ARTIFACT_DIR = 'dist/schematic'

const resolveRaijinDependency = ({ project }: YarnProjectContext): Descriptor => {
  const { manifest } = project.topLevelWorkspace

  for (const dependencyScope of Manifest.hardDependencies) {
    const dependency = manifest[dependencyScope].get(RAIJIN_IDENT.identHash)

    if (dependency) {
      return dependency
    }
  }

  throw new Error('@atls/raijin is not installed in the project root')
}

const resolveRaijinPackage = async ({
  configuration,
  project,
}: YarnProjectContext): Promise<Package> => {
  await project.restoreInstallState()

  const resolver = configuration.makeResolver()
  const dependency = resolveRaijinDependency({ configuration, project })
  const descriptor = resolver.bindDescriptor(
    dependency,
    project.topLevelWorkspace.anchoredLocator,
    { project, resolver }
  )
  const locatorHash = project.storedResolutions.get(descriptor.descriptorHash)
  const resolvedPackage = locatorHash ? project.storedPackages.get(locatorHash) : undefined

  if (!resolvedPackage) {
    throw new Error('@atls/raijin has no installed package resolution. Run yarn install.')
  }

  const locator = structUtils.isVirtualLocator(resolvedPackage)
    ? structUtils.devirtualizeLocator(resolvedPackage)
    : resolvedPackage
  const physicalPackage = project.storedPackages.get(locator.locatorHash)

  if (!physicalPackage) {
    throw new Error('@atls/raijin has no physical package resolution. Run yarn install.')
  }

  return physicalPackage
}

export const withProjectGenerationArtifact = async <TResult>(
  context: YarnProjectContext,
  consume: ProjectGenerationArtifactConsumer<TResult>
): Promise<TResult> => {
  const pkg = await resolveRaijinPackage(context)
  const cache = await Cache.find(context.configuration, { immutable: true })
  const fetcher = context.configuration.makeFetcher()
  const fetchResult = await fetcher.fetch(pkg, {
    cache,
    checksums: context.project.storedChecksums,
    fetcher,
    project: context.project,
    report: new ThrowReport(),
  })

  try {
    const source = ppath.join(fetchResult.prefixPath, ARTIFACT_DIR)

    await assertProjectGenerationArtifact(source, fetchResult.packageFs)

    return await xfs.mktempPromise(async (temporaryDir) => {
      const artifactDir = ppath.join(temporaryDir, 'schematic')

      await xfs.copyPromise(artifactDir, source, { baseFs: fetchResult.packageFs })

      return consume(resolveProjectCollectionPath(artifactDir))
    })
  } finally {
    fetchResult.releaseFs?.()
  }
}
