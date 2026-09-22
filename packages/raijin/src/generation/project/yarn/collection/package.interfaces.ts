import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'
import type { FakeFS }        from '@yarnpkg/fslib'
import type { PortablePath }  from '@yarnpkg/fslib'

export interface Context {
  readonly configuration: Configuration
  readonly project: Project
  readonly workspace: Workspace
}

export interface Manifest {
  readonly schematics?: unknown
}

export interface Source {
  readonly collectionRoot: PortablePath
  readonly packageFs: FakeFS<PortablePath>
}

export interface Materialized {
  readonly collectionPath: string
}
