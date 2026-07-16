import type { PortablePath } from '@yarnpkg/fslib'

export interface RendererBuildContext {
  readonly appCwd: PortablePath
  readonly distCwd: PortablePath
  readonly rendererCwd: PortablePath
}

export interface RendererBuildArtifactContext extends RendererBuildContext {
  readonly artifactAppCwd: PortablePath
  readonly artifactNextOutputCwd: PortablePath
  readonly nextOutputCwd: PortablePath
  readonly standaloneAppCwd: PortablePath
  readonly standaloneCwd: PortablePath
}

export interface RendererBuildManifestState {
  readonly mtimeMs: number
  readonly size: number
}

export type RendererBuildManifestSnapshot = ReadonlyMap<PortablePath, RendererBuildManifestState>

export interface NextRequiredServerFilesManifest {
  readonly appDir: string
  readonly relativeAppDir: string
  readonly config: {
    readonly output: 'standalone'
    readonly outputFileTracingRoot: string
  }
}

export interface RendererBuildManifestCandidate {
  readonly manifest: NextRequiredServerFilesManifest
  readonly path: PortablePath
}

export interface RendererBuildEnvOptions {
  readonly nextConfigAdapterPath?: PortablePath
  readonly output?: string
}
