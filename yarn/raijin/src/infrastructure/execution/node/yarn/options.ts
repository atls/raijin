import type { Locator } from '@yarnpkg/core'
import type { Project } from '@yarnpkg/core'

export interface Options {
  baseEnvironment?: NodeJS.ProcessEnv
  locator?: Locator
  project: Project
}
