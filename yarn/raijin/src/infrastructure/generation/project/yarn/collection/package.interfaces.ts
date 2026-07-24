import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { FakeFS }        from '@yarnpkg/fslib'
import type { PortablePath }  from '@yarnpkg/fslib'

export interface YarnContext {
  readonly configuration: Configuration
  readonly project: Project
}

export interface PackageSource {
  readonly packageCollectionPath: PortablePath
  readonly packageFs: FakeFS<PortablePath>
}

export interface PackageManifest {
  readonly schematics?: unknown
}
