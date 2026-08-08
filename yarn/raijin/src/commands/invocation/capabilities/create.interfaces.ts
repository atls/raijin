import type { Configuration }   from '@yarnpkg/core'
import type { Project }         from '@yarnpkg/core'
import type { PortablePath }    from '@yarnpkg/fslib'

import type { ProcessExecutor } from './process.interfaces.js'

export interface ProcessInvocationOptions {
  environment: NodeJS.ProcessEnv
  executionCwd: PortablePath
  executor: ProcessExecutor
}

export interface InvocationCapabilitiesOptions {
  configuration: Configuration
  environment: NodeJS.ProcessEnv
  executionCwd: PortablePath
  executor: ProcessExecutor
  project: Project
}
