import type { Workspace }                 from '@yarnpkg/core'
import type { Cache }                     from '@yarnpkg/core'
import type { Project }                   from '@yarnpkg/core'
import type { Report }                    from '@yarnpkg/core'
import type { PortablePath }              from '@yarnpkg/fslib'

import { Manifest }                       from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'

import { getProjectResolutionPatchPaths } from './patch-files/paths.js'
import { getWorkspacePatchPaths }         from './patch-files/paths.js'
import { resolvePatchPath }               from './patch-files/paths.js'
import { getRequiredWorkspaces }          from './workspaces.utils.js'

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

export const copyPatchFiles = async (
  project: Project,
  workspace: Workspace,
  destination: PortablePath,
  report: Report
): Promise<void> => {
  const copiedPaths = new Set<PortablePath>()
  const copyOperations = new Array<{ dest: PortablePath; src: PortablePath }>()

  const registerPatchFile = (path: PortablePath): void => {
    const { relativePath, src } = resolvePatchPath(project.cwd, path, 'standalone workspace')

    if (copiedPaths.has(relativePath)) return

    copiedPaths.add(relativePath)

    const dest = ppath.join(destination, relativePath)

    report.reportInfo(null, relativePath)

    copyOperations.push({ dest, src })
  }

  for (const path of getProjectResolutionPatchPaths(project)) {
    registerPatchFile(path.startsWith('~/') ? (path.slice(2) as PortablePath) : path)
  }

  for (const requiredWorkspace of getRequiredWorkspaces(project, [workspace], true)) {
    for (const path of getWorkspacePatchPaths(requiredWorkspace)) {
      if (!path.startsWith('~/')) continue

      registerPatchFile(path.slice(2) as PortablePath)
    }
  }

  await Promise.all(
    copyOperations.map(async ({ dest, src }) => {
      await xfs.mkdirpPromise(ppath.dirname(dest))
      await xfs.copyFilePromise(src, dest)
    })
  )
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
