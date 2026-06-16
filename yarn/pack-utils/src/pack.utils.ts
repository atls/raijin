/// <reference path='./configuration-value-map.d.ts' />

import type { Workspace }             from '@yarnpkg/core'
import type { Report }                from '@yarnpkg/core'
import type { PortablePath }          from '@yarnpkg/fslib'

import { arch }                       from 'node:os'

import { Configuration }              from '@yarnpkg/core'
import { Project }                    from '@yarnpkg/core'
import { Cache }                      from '@yarnpkg/core'
import { CwdFS }                      from '@yarnpkg/fslib'
import { tgzUtils }                   from '@yarnpkg/core'
import { ppath }                      from '@yarnpkg/fslib'
import { packUtils }                  from '@yarnpkg/plugin-pack'

import { ExportCache }                from './export/ExportCache.js'
import { copyRcFile }                 from './copy.utils.js'
import { copyYarnRelease }            from './copy.utils.js'
import { genPackTgz }                 from './export/exportUtils.js'
import { makeFetcher }                from './export/exportUtils.js'
import { makeResolver }               from './export/exportUtils.js'
import { getYarnPathFromDestination } from './yarn-path.utils.js'

const DEFAULT_IMAGE_OS = 'linux'
const DEFAULT_LINUX_LIBC = 'glibc'
export const IMAGE_PACK_NODE_LINKER = 'pnp'
const CPU_ALIASES = {
  386: 'ia32',
  amd64: 'x64',
  mips64le: 'mips64el',
  ppc64le: 'ppc64',
} as Record<string, string>
const OS_ALIASES = {
  windows: 'win32',
} as Record<string, string>

interface PackOptions {
  platform?: string
}

const normalizeTargetCpu = (cpu: string | undefined): string | undefined => {
  if (!cpu) {
    return undefined
  }

  return CPU_ALIASES[cpu] ?? cpu
}

const normalizeTargetOs = (os: string): string => OS_ALIASES[os] ?? os

export const resolveSupportedArchitectures = (
  platform: string | undefined
): Map<string, Array<string> | null> => {
  const [os, cpu] = platform?.split('/').slice(0, 2) ?? []
  const targetOs = normalizeTargetOs(os || DEFAULT_IMAGE_OS)

  return new Map([
    ['os', [targetOs]],
    ['cpu', [normalizeTargetCpu(cpu) ?? normalizeTargetCpu(arch()) ?? arch()]],
    ['libc', targetOs === 'linux' ? [DEFAULT_LINUX_LIBC] : []],
  ])
}

export const pack = async (
  configuration: Configuration,
  project: Project,
  workspace: Workspace,
  report: Report,
  destination: PortablePath,
  options: PackOptions = {}
): Promise<void> => {
  // @ts-expect-error boolean to string
  process.env.IMAGE_PACK = true

  const cache = await Cache.find(configuration, { immutable: true })

  await project.restoreInstallState()

  await packUtils.prepareForPack(workspace, { report }, async () => {
    workspace.manifest.devDependencies.clear()

    const baseFs = new CwdFS(destination)

    const tgz = await genPackTgz(workspace)

    await tgzUtils.extractArchiveTo(tgz, baseFs, { stripComponents: 1 })
    await copyRcFile(project, destination, report)

    if (project.configuration.get('yarnPath')) {
      await copyYarnRelease(project, destination, report)
    }

    const tmpConfiguration = Configuration.create(destination, destination, configuration.plugins)

    tmpConfiguration.values.set('compressionLevel', project.configuration.get('compressionLevel'))
    tmpConfiguration.values.set('enableGlobalCache', false)
    tmpConfiguration.values.set('enableMirror', false)
    tmpConfiguration.values.set('globalFolder', configuration.get('globalFolder'))
    tmpConfiguration.values.set('nodeLinker', IMAGE_PACK_NODE_LINKER)
    tmpConfiguration.values.set('pnpEnableEsmLoader', configuration.get('pnpEnableEsmLoader'))
    if (options.platform) {
      tmpConfiguration.values.set(
        'supportedArchitectures',
        resolveSupportedArchitectures(options.platform)
      )
    }
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
      globalFolder: `.yarn/berry` as PortablePath,
      nodeLinker: IMAGE_PACK_NODE_LINKER,
      yarnPath: await getYarnPathFromDestination(destination),
    })

    await tmpConfiguration.getPackageExtensions()

    const { project: tmpProject, workspace: tmpWorkspace } = await Project.find(
      tmpConfiguration,
      destination
    )

    if (!tmpWorkspace) {
      throw new Error('Workspace not found')
    }

    tmpWorkspace.manifest.dependencies = workspace.manifest.dependencies
    tmpWorkspace.manifest.resolutions = project.topLevelWorkspace.manifest.resolutions
    tmpWorkspace.manifest.devDependencies.clear()

    await tmpProject.install({
      cache: await ExportCache.find(tmpConfiguration, cache),
      fetcher: makeFetcher(project),
      resolver: makeResolver(project),
      persistProject: true,
      report,
    })
  })
}
