import type { Workspace }    from '@yarnpkg/core'
import type { Cache }        from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { Report }       from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

import { Manifest }          from '@yarnpkg/core'
import { structUtils }       from '@yarnpkg/core'
import { xfs }               from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { patchUtils }        from '@yarnpkg/plugin-patch'

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
  workspaces: Array<Workspace>,
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
  const pluginDir = ppath.join('.yarn', 'plugins')

  if (await xfs.existsPromise(ppath.join(project.cwd, pluginDir))) {
    report.reportInfo(null, pluginDir)

    await xfs.copyPromise(ppath.join(destination, pluginDir), ppath.join(project.cwd, pluginDir), {
      overwrite: true,
    })
  }
}

const BUILTIN_REGEXP = /^builtin<([^>]+)>$/

export const copyPatchFiles = async (
  project: Project,
  workspace: Workspace,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const copiedPaths = new Map<PortablePath, PortablePath>()

  for await (const descriptor of project.storedDescriptors.values()) {
    const resolvedDescriptor = structUtils.isVirtualDescriptor(descriptor)
      ? structUtils.devirtualizeDescriptor(descriptor)
      : descriptor

    if (!patchUtils.isPatchDescriptor(resolvedDescriptor)) continue

    const { parentLocator, patchPaths } = patchUtils.parseDescriptor(resolvedDescriptor)

    for await (const rawPath of patchPaths) {
      const flagIndex = rawPath.lastIndexOf('!')
      const path = (flagIndex === -1 ? rawPath : rawPath.slice(flagIndex + 1)) as PortablePath

      if (BUILTIN_REGEXP.test(path)) continue
      if (ppath.isAbsolute(path)) continue

      const isProjectPath = path.startsWith('~/')
      let sourceCwd: PortablePath
      let src: PortablePath

      if (isProjectPath) {
        sourceCwd = project.cwd
        src = ppath.resolve(sourceCwd, path.slice(2) as PortablePath)
      } else {
        if (parentLocator === null) continue

        const parentWorkspace = project.tryWorkspaceByLocator(parentLocator)

        if (!parentWorkspace) continue
        if (parentWorkspace !== project.topLevelWorkspace && parentWorkspace !== workspace) continue

        sourceCwd = parentWorkspace.cwd
        src = ppath.resolve(sourceCwd, path)
      }

      const relativePath = ppath.contains(sourceCwd, src)

      if (relativePath === null) {
        throw new Error(`Patch path ${path} resolves outside the standalone workspace`)
      }

      const previousSrc = copiedPaths.get(relativePath)

      if (previousSrc === src) continue

      if (previousSrc) {
        throw new Error(`Patch files ${previousSrc} and ${src} resolve to ${relativePath}`)
      }

      copiedPaths.set(relativePath, src)

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
  const src = ppath.join(project.cwd, filename)

  if (!(await xfs.existsPromise(src))) {
    return
  }

  report.reportInfo(null, filename)

  await xfs.copyPromise(ppath.join(destination, filename), src, {
    overwrite: true,
  })
}

export const copyYarnRelease = async (
  project: Project,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const src = project.configuration.get('yarnPath')

  if (!src) {
    throw new Error('`yarnPath` is not set')
  }

  const path = ppath.relative(project.cwd, src)
  const dest = ppath.join(destination, path)

  report.reportInfo(null, path)

  await xfs.copyPromise(dest, src, {
    overwrite: true,
  })
}
