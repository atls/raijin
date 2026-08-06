import type { Configuration }              from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from './context.interfaces.js'

export interface ProcessInvocationOptions {
  context: InvocationExecutionContext
  executionCwd: PortablePath
}

export interface InvocationCapabilitiesOptions {
  configuration: Configuration
  context: InvocationExecutionContext
  executionCwd: PortablePath
  project: Project
}
