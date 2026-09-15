import type { Filename }               from '@yarnpkg/fslib'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { RendererArtifactLayout } from './layout.interfaces.js'
import type { RendererArtifactTarget } from './layout.interfaces.js'
import type { RendererArtifactSource } from './source.interfaces.js'

import { ppath }                       from '@yarnpkg/fslib'

const DIST_DIR = 'dist' as Filename
const SRC_DIR = 'src' as Filename

export const createArtifactTarget = (rendererCwd: PortablePath): RendererArtifactTarget => ({
  appCwd: ppath.join(rendererCwd, SRC_DIR),
  distCwd: ppath.join(rendererCwd, DIST_DIR),
  rendererCwd,
})

export const createArtifactLayout = (
  target: RendererArtifactTarget,
  source: RendererArtifactSource
): RendererArtifactLayout => {
  if (target.appCwd !== source.appCwd) {
    throw new Error('Renderer artifact source does not belong to the selected application')
  }

  const artifactAppCwd = ppath.join(target.distCwd, source.appRelativeCwd)

  if (ppath.contains(target.distCwd, artifactAppCwd) === null) {
    throw new Error('Renderer artifact source resolves outside the selected target')
  }

  return {
    ...source,
    ...target,
    artifactAppCwd,
    artifactNextOutputCwd: ppath.join(artifactAppCwd, source.nextOutputRelativeCwd),
  }
}
