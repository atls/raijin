import type { Locator }      from '@yarnpkg/core'
import type { Project }      from '@yarnpkg/core'
import type { PortablePath } from '@yarnpkg/fslib'

export interface InstallPackageBinariesOptions {
  binFolder: PortablePath
  locator: Locator
  project: Project
}

export interface PackageBinaryWrapper {
  arguments: ReadonlyArray<string>
  executable: string
  name: string
}

export interface PnpPackageInformation {
  packageLocation: string
}

export interface PnpRuntimeApi {
  getPackageInformation: (locator: {
    name: string
    reference: string
  }) => PnpPackageInformation | null
}
