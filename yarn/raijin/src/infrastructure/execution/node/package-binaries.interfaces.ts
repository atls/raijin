import type { Locator }       from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'

import type { PnpRuntimeApi } from './pnp-api.interfaces.js'

export interface InstallPackageBinariesOptions {
  binFolder: PortablePath
  locator: Locator
  pnpApi: PnpRuntimeApi
  project: Project
}

export interface PackageBinaryWrapper {
  arguments: ReadonlyArray<string>
  executable: string
  name: string
}
