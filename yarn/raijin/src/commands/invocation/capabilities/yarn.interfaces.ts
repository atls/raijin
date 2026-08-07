import type { Configuration }          from '@yarnpkg/core'
import type { Locator }                from '@yarnpkg/core'
import type { Project }                from '@yarnpkg/core'

import type { ProcessExecutionResult } from './process.interfaces.js'
import type { ProcessOutputPolicy }    from './process.interfaces.js'

export interface YarnCommandRunOptions {
  input?: 'ignore'
  locator?: Locator
  output?: ProcessOutputPolicy
  timeoutMs?: number
}

export interface YarnCommandCaptureOptions extends Omit<YarnCommandRunOptions, 'output'> {
  forwardOutput?: boolean
}

export interface YarnRuntimeInvocation {
  configuration: Configuration
  project: Project
  capture: (
    args: Array<string>,
    options?: YarnCommandCaptureOptions
  ) => Promise<ProcessExecutionResult>
  execute: (args: Array<string>, options?: YarnCommandRunOptions) => Promise<number>
  run: (args: Array<string>, options?: YarnCommandRunOptions) => Promise<ProcessExecutionResult>
}
