import { Workspace }    from '@yarnpkg/core'
import { Manifest }     from '@yarnpkg/core'
import { Cache }        from '@yarnpkg/core'
import { Project }      from '@yarnpkg/core'
import { Report }       from '@yarnpkg/core'
import { Descriptor }   from '@yarnpkg/core'
import { Locator }      from '@yarnpkg/core'
import { PortablePath } from '@yarnpkg/fslib'
import { structUtils }  from '@yarnpkg/core'
import { xfs }          from '@yarnpkg/fslib'
import { ppath }        from '@yarnpkg/fslib'
import { Filename }   from '@yarnpkg/fslib'

export const copyCacheMarkedFiles = async (
  project: Project,
  cache: Cache,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  for await (const src of cache.markedFiles) {
    const path = ppath.relative(project.cwd, src)

    report.reportInfo(null, path)

    await xfs.copyPromise(ppath.join(destination, path), src)
  }
}

export const copyManifests = async (
  workspaces: Workspace[],
  destination: PortablePath,
  report: Report
): Promise<void> => {
  for await (const ws of workspaces) {
    const path = ppath.join(ws.relativeCwd, Manifest.fileName)
    const dest = ppath.join(destination, path)
    const data = {}

    ws.manifest.exportTo(data)

    report.reportInfo(null, path)

    await xfs.mkdirpPromise(ppath.dirname(dest))

    await xfs.writeJsonPromise(dest, data)
  }
}

export const copyPlugins = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const pluginDir = ppath.join('.yarn' as Filename, 'plugins' as Filename)

  if (await xfs.existsPromise(ppath.join(project.cwd, pluginDir))) {
    report.reportInfo(null, pluginDir)

    await xfs.copyPromise(ppath.join(destination, pluginDir), ppath.join(project.cwd, pluginDir), {
      overwrite: true,
    })
  }
}

// https://github.com/yarnpkg/berry/blob/d38d573/packages/plugin-patch/sources/patchUtils.ts#L10
const BUILTIN_REGEXP = /^builtin<([^>]+)>$/

export const copyProtocolFiles = async (
  project: Project,
  destination: PortablePath,
  report: Report,
  parseDescriptor: (
    descriptor: Descriptor
  ) => { parentLocator: Locator; paths: PortablePath[] } | undefined
): Promise<void> => {
  const copiedPaths = new Set<string>()

  for await (const descriptor of project.storedDescriptors.values()) {
    const resolvedDescriptor = structUtils.isVirtualDescriptor(descriptor)
      ? structUtils.devirtualizeDescriptor(descriptor)
      : descriptor

    const parsed = parseDescriptor(resolvedDescriptor)

    // eslint-disable-next-line no-continue
    if (!parsed) continue

    const { parentLocator, paths } = parsed

    for await (const path of paths) {
      // eslint-disable-next-line no-continue
      if (BUILTIN_REGEXP.test(path)) continue

      // eslint-disable-next-line no-continue
      if (ppath.isAbsolute(path)) continue

      const parentWorkspace = project.getWorkspaceByLocator(parentLocator)

      const relativePath = ppath.join(parentWorkspace.relativeCwd, path)

      // eslint-disable-next-line no-continue
      if (copiedPaths.has(relativePath)) continue

      copiedPaths.add(relativePath)

      const src = ppath.join(parentWorkspace.cwd, path)
      const dest = ppath.join(destination, relativePath)

      report.reportInfo(null, relativePath)

      await xfs.mkdirpPromise(ppath.dirname(dest))

      await xfs.copyFilePromise(src, dest)
    }
  }
}

export const copyRcFile = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const filename = project.configuration.get('rcFilename')

  report.reportInfo(null, filename)

  await xfs.copyPromise(ppath.join(destination, filename), ppath.join(project.cwd, filename), {
    overwrite: true,
  })
}

export const copyYarnRelease = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const src = project.configuration.get('yarnPath') as PortablePath
  const path = ppath.relative(project.cwd, src)
  const dest = ppath.join(destination, path)

  report.reportInfo(null, path)

  await xfs.copyPromise(dest, src, {
    overwrite: true,
  })
}
