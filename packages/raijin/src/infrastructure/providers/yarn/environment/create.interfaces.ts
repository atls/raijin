import type { Locator }          from '@yarnpkg/core'
import type { Project }          from '@yarnpkg/core'

import type { EnvironmentPatch } from '../../../../application/execution/index.js'

export interface Input {
  baseEnvironment?: NodeJS.ProcessEnv
  binDirectory: string
  cwd: string
  locator?: Locator
  patch: EnvironmentPatch
  project: Project
}
