import type { Configuration }            from '@yarnpkg/core'
import type { Project }                  from '@yarnpkg/core'
import type { PortablePath }             from '@yarnpkg/fslib'

import type { InvocationAdapterContext } from '../adapters/context.interfaces.js'

export interface ProcessInvocationOptions {
  context: InvocationAdapterContext
  executionCwd: PortablePath
}

export interface InvocationCapabilitiesOptions {
  configuration: Configuration
  context: InvocationAdapterContext
  executionCwd: PortablePath
  project: Project
}
