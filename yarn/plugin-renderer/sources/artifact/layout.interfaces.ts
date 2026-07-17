import type { PortablePath }           from '@yarnpkg/fslib'

import type { RendererArtifactSource } from './source.interfaces.js'

export interface RendererArtifactTarget {
  readonly appCwd: PortablePath
  readonly distCwd: PortablePath
  readonly rendererCwd: PortablePath
}

export interface RendererArtifactLayout extends RendererArtifactSource, RendererArtifactTarget {
  readonly artifactAppCwd: PortablePath
  readonly artifactNextOutputCwd: PortablePath
}
