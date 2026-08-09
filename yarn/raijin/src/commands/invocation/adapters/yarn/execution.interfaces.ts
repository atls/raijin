import type { Locator }                 from '@yarnpkg/core'
import type { Project }                 from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ProcessEnvironmentPatch } from '../../capabilities/process.interfaces.js'
import type { YarnCommandRunOptions }   from '../../capabilities/yarn.interfaces.js'
import type { Executor }                from '../../executor.js'

export interface YarnExecutableOptions {
  baseEnvironment?: NodeJS.ProcessEnv
  binFolder: PortablePath
  environmentPatch?: ProcessEnvironmentPatch
  project: Project
  locator?: Locator
  nodeLoader?: string
  nodeOptions?: string | null
}

export interface YarnExecutable {
  env: NodeJS.ProcessEnv
  executable: string
}

export interface YarnCommandOptions {
  args: Array<string>
  environment: NodeJS.ProcessEnv
  executionCwd: PortablePath
  executor: Executor
  options?: YarnCommandRunOptions
  project: Project
}
