import type { Configuration }              from '@yarnpkg/core'
import type { Project }                    from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from '../adapters/child-process.interfaces.js'

export interface ChildProcessInvocationOptions {
  context: InvocationExecutionContext
  executionCwd: PortablePath
  projectCwd?: PortablePath
}

export interface InvocationCapabilitiesOptions {
  configuration: Configuration
  context: InvocationExecutionContext
  executionCwd: PortablePath
  project: Project
}
