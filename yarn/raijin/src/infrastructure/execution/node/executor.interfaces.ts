import type { Locator }                     from '@yarnpkg/core'
import type { Project }                     from '@yarnpkg/core'
import type { PortablePath }                from '@yarnpkg/fslib'

import type { ManagedNodeEnvironmentPatch } from '../../../application/execution/node/index.js'

export interface TemporaryDirectory {
  path: string
  remove: () => Promise<void>
}

export interface TemporaryDirectoryProvider {
  create: () => Promise<TemporaryDirectory>
}

export interface YarnManagedNodeExecutorOptions {
  baseEnvironment?: NodeJS.ProcessEnv
  loaders?: ReadonlyArray<string>
  locator?: Locator
  project: Project
  temporaryDirectories?: TemporaryDirectoryProvider
}

export interface YarnNodeEnvironmentOptions {
  baseEnvironment: NodeJS.ProcessEnv
  binFolder: PortablePath
  cwd: string
  environmentPatch: ManagedNodeEnvironmentPatch
  locator?: Locator
  project: Project
}
