import { Configuration } from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import { Report }        from '@yarnpkg/core'
import type { Locator }       from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'
import type { Filename }      from '@yarnpkg/fslib'

import { Cache }              from '@yarnpkg/core'
import { CwdFS }              from '@yarnpkg/fslib'
import { structUtils }        from '@yarnpkg/core'
import { tgzUtils }           from '@yarnpkg/core'
import { toFilename }         from '@yarnpkg/fslib'
import { xfs }                from '@yarnpkg/fslib'
import { ppath }              from '@yarnpkg/fslib'
import { npath }              from '@yarnpkg/fslib'
import { packUtils }          from '@yarnpkg/plugin-pack'

import { ExportCache }        from './export/ExportCache.js'
import { copyRcFile }         from './copy.utils.js'
import { copyPlugins }        from './copy.utils.js'
import { copyYarnRelease }    from './copy.utils.js'
import { genPackTgz }         from './export/exportUtils.js'
import { makeFetcher }        from './export/exportUtils.js'
import { makeResolver }       from './export/exportUtils.js'

export const generateLockfile = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  // @ts-expect-error
  const filename = toFilename(project.configuration.get('lockfileFilename'))
  const dest = ppath.join(destination, filename)

  report.reportInfo(null, filename)

  await xfs.mkdirpPromise(ppath.dirname(dest))
  await xfs.writeFilePromise(dest, project.generateLockfile())
}

export function parseSpec(
  spec: string
): { parentLocator: Locator | null; path: PortablePath } | undefined {
  const { params, selector } = structUtils.parseRange(spec)

  const path = npath.toPortablePath(selector)

  const parentLocator =
    params && typeof params.locator === 'string' ? structUtils.parseLocator(params.locator) : null

  return { parentLocator, path }
}

export const pack = async (
  configuration: Configuration,
  project: Project,
  workspace: Workspace,
  report: Report,
  destination: PortablePath
) => {
  const cache = await Cache.find(configuration, { immutable: true })

  await project.restoreInstallState()

  await packUtils.prepareForPack(workspace, { report }, async () => {
    workspace.manifest.devDependencies.clear()

    const baseFs = new CwdFS(destination)

    const tgz = await genPackTgz(workspace)

    // @ts-expect-error any
    await tgzUtils.extractArchiveTo(tgz, baseFs, { stripComponents: 1 })

    const tmpConfiguration = Configuration.create(destination, destination, configuration.plugins)

    tmpConfiguration.values.set(
      `bstatePath`,
      ppath.join(destination, `build-state.yml` as Filename)
    )

    // tmpConfiguration.values.set(`enableNetwork`, false);
    // tmpConfiguration.values.set(`enableMirror`, false);

    tmpConfiguration.values.set(`compressionLevel`, configuration.get(`compressionLevel`))
    tmpConfiguration.values.set(`globalFolder`, configuration.get(`globalFolder`))
    tmpConfiguration.values.set(`packageExtensions`, configuration.get(`packageExtensions`))

    // @ts-expect-error any
    await tmpConfiguration.refreshPackageExtensions()

    const { project: tmpProject, workspace: tmpWorkspace } = await Project.find(
      tmpConfiguration,
      destination
    )

    tmpWorkspace!.manifest.dependencies = workspace.manifest.dependencies
    tmpWorkspace!.manifest.peerDependencies = workspace.manifest.peerDependencies
    tmpWorkspace!.manifest.resolutions = project.topLevelWorkspace.manifest.resolutions
    tmpWorkspace!.manifest.dependenciesMeta = project.topLevelWorkspace.manifest.dependenciesMeta
    tmpWorkspace!.manifest.devDependencies.clear()

    await tmpProject.install({
      // @ts-expect-error any
      cache: await ExportCache.find(tmpConfiguration, cache),
      fetcher: makeFetcher(project),
      resolver: makeResolver(project),
      report,
      persistProject: false,
    })

    await report.startTimerPromise('Copy RC files', async () => {
      await copyRcFile(project, destination, report)
    })

    await report.startTimerPromise('Copy plugins', async () => {
      await copyPlugins(project, destination, report)
    })

    await report.startTimerPromise('Copy Yarn releases', async () => {
      await copyYarnRelease(project, destination, report)
    })

    await generateLockfile(tmpProject, destination, report)

    await xfs.writeJsonPromise(ppath.join(destination, 'package.json' as PortablePath), {
      ...tmpWorkspace!.manifest.exportTo({}),
      devDependencies: {},
    })
  })
}
