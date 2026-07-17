import type { PortablePath } from '@yarnpkg/fslib'

export interface NextStandaloneManifestState {
  readonly mtimeMs: number
  readonly size: number
}

export type NextStandaloneManifestSnapshot = ReadonlyMap<PortablePath, NextStandaloneManifestState>
