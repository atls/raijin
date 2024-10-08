import type { Workspace }    from '@yarnpkg/core'
import type { Report }       from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import { Configuration }     from '@yarnpkg/core'
import { Project }           from '@yarnpkg/core'
import { Cache }             from '@yarnpkg/core'
import { CwdFS }             from '@yarnpkg/fslib'
import { tgzUtils }          from '@yarnpkg/core'
import { ppath }             from '@yarnpkg/fslib'
import { packUtils }         from '@yarnpkg/plugin-pack'

import { ExportCache }       from './export/ExportCache.js'
import { genPackTgz }        from './export/exportUtils.js'
import { makeFetcher }       from './export/exportUtils.js'
import { makeResolver }      from './export/exportUtils.js'

export const pack = async (
  configuration: Configuration,
  project: Project,
  workspace: Workspace,
  report: Report,
  destination: PortablePath
): Promise<void> => {
  process.env.IMAGE_PACK = true

  const cache = await Cache.find(configuration, { immutable: true })

  await project.restoreInstallState()

  await packUtils.prepareForPack(workspace, { report }, async () => {
    workspace.manifest.devDependencies.clear()

    const baseFs = new CwdFS(destination)

    const tgz = await genPackTgz(workspace)

    await tgzUtils.extractArchiveTo(tgz, baseFs, { stripComponents: 1 })

    const tmpConfiguration = Configuration.create(destination, destination, configuration.plugins)

    tmpConfiguration.values.set('compressionLevel', project.configuration.get('compressionLevel'))
    tmpConfiguration.values.set('enableGlobalCache', false)
    tmpConfiguration.values.set('enableMirror', false)
    tmpConfiguration.values.set('globalFolder', configuration.get('globalFolder'))
    tmpConfiguration.values.set('packageExtensions', configuration.get('packageExtensions'))
    tmpConfiguration.values.set('pnpEnableEsmLoader', configuration.get('pnpEnableEsmLoader'))
    tmpConfiguration.values.set(
      `cacheFolder`,
      ppath.join(destination, `.yarn/packages` as PortablePath)
    )
    tmpConfiguration.values.set('preferAggregateCacheInfo', true)

    await Configuration.updateConfiguration(destination, {
      cacheFolder: `.yarn/packages` as PortablePath,
      compressionLevel: tmpConfiguration.get(`compressionLevel`),
      enableGlobalCache: tmpConfiguration.get(`enableGlobalCache`),
      enableNetwork: tmpConfiguration.get(`enableNetwork`),
      enableMirror: tmpConfiguration.get(`enableMirror`),
      packageExtensions: tmpConfiguration.get(`packageExtensions`),
      nodeLinker: project.configuration.get('nodeLinker'),
    })

    await tmpConfiguration.getPackageExtensions()

    const { project: tmpProject, workspace: tmpWorkspace } = await Project.find(
      tmpConfiguration,
      destination
    )

    tmpWorkspace!.manifest.dependencies = workspace.manifest.dependencies
    tmpWorkspace!.manifest.resolutions = project.topLevelWorkspace.manifest.resolutions
    tmpWorkspace!.manifest.devDependencies.clear()

    await tmpProject.install({
      cache: await ExportCache.find(tmpConfiguration, cache),
      fetcher: makeFetcher(project),
      resolver: makeResolver(project),
      persistProject: true,
      report,
    })
  })
}
