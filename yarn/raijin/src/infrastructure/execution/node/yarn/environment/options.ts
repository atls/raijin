import type { Locator }          from '@yarnpkg/core'
import type { Project }          from '@yarnpkg/core'
import type { PortablePath }     from '@yarnpkg/fslib'

import type { EnvironmentPatch } from '../../../../../application/execution/node/index.js'

export interface Options {
  baseEnvironment: NodeJS.ProcessEnv
  binFolder: PortablePath
  cwd: string
  environmentPatch: EnvironmentPatch
  locator?: Locator
  project: Project
}
