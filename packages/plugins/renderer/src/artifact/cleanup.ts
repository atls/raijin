import type { Filename }               from '@yarnpkg/fslib'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { RendererArtifactLayout } from './layout.interfaces.js'
import type { RendererArtifactTarget } from './layout.interfaces.js'

import { ppath }                       from '@yarnpkg/fslib'
import { xfs }                         from '@yarnpkg/fslib'

const NEXT_DIR = '.next' as Filename
const PACKAGE_MANIFEST = 'package.json' as Filename
const SRC_DIR = 'src' as Filename

const isTemporarySourceManifest = (manifest: unknown): boolean => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return false
  }

  const entries = Object.entries(manifest)

  return entries.length === 1 && entries[0][0] === 'type' && entries[0][1] === 'module'
}

const findSourceCwd = (cwd: PortablePath): PortablePath | undefined => {
  let current = cwd

  while (current !== ppath.dirname(current)) {
    if (ppath.basename(current) === SRC_DIR) {
      return current
    }

    current = ppath.dirname(current)
  }

  return undefined
}

const cleanupSourceManifest = async (sourceCwd: PortablePath): Promise<void> => {
  const manifestPath = ppath.join(sourceCwd, PACKAGE_MANIFEST)

  if (!(await xfs.existsPromise(manifestPath))) {
    return
  }

  const manifest = (await xfs.readJsonPromise(manifestPath)) as unknown

  if (isTemporarySourceManifest(manifest)) {
    await xfs.removePromise(manifestPath)
  }
}

export const cleanupDiscoveryArtifacts = async (cwd: PortablePath): Promise<void> => {
  const sourceCwd = findSourceCwd(cwd)

  if (sourceCwd) {
    await cleanupSourceManifest(sourceCwd)
  }
}

export const cleanupTargetArtifacts = async ({
  appCwd,
  distCwd,
  rendererCwd,
}: RendererArtifactTarget): Promise<void> => {
  await Promise.all(
    [distCwd, ppath.join(rendererCwd, NEXT_DIR)].map(async (path) => {
      if (await xfs.existsPromise(path)) {
        await xfs.removePromise(path)
      }
    })
  )
  await cleanupSourceManifest(appCwd)
}

export const cleanupSourceArtifacts = async ({
  nextOutputCwd,
}: RendererArtifactLayout): Promise<void> => {
  if (await xfs.existsPromise(nextOutputCwd)) {
    await xfs.removePromise(nextOutputCwd)
  }
}
