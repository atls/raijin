import type { Configuration } from '@yarnpkg/core'
import type { Project }       from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'

import type { Executor }      from '../executor.js'

export interface ProcessInvocationOptions {
  environment: NodeJS.ProcessEnv
  executionCwd: PortablePath
  executor: Executor
}

export interface InvocationCapabilitiesOptions {
  configuration: Configuration
  environment: NodeJS.ProcessEnv
  executionCwd: PortablePath
  executor: Executor
  project: Project
}
