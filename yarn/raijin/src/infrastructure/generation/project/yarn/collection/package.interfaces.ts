import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { FakeFS }        from '@yarnpkg/fslib'
import type { PortablePath }  from '@yarnpkg/fslib'

export interface Context {
  readonly configuration: Configuration
  readonly project: Project
}

export interface Manifest {
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
  readonly schematics?: unknown
}

export interface Source {
  readonly collectionRoot: PortablePath
  readonly manifest: Manifest
  readonly packageFs: FakeFS<PortablePath>
}

export interface Materialized {
  readonly collectionPath: string
  readonly manifest: Manifest
}
