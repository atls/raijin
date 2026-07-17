import type { PortablePath } from '@yarnpkg/fslib'

export interface RendererArtifactSource {
  readonly appCwd: PortablePath
  readonly appRelativeCwd: PortablePath
  readonly nextOutputCwd: PortablePath
  readonly nextOutputRelativeCwd: PortablePath
  readonly standaloneAppCwd: PortablePath
  readonly standaloneCwd: PortablePath
}
