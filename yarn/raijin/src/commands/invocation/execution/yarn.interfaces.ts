import type { Configuration }           from '@yarnpkg/core'
import type { Locator }                 from '@yarnpkg/core'
import type { Project }                 from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ProcessEnvironmentPatch } from './process.interfaces.js'
import type { ProcessExecutionResult }  from './process.interfaces.js'
import type { ProcessOutputPolicy }     from './process.interfaces.js'

export interface YarnCommandPreparationContext {
  binFolder: PortablePath
  nodeOptions: string | undefined
}

export interface YarnCommandPreparation {
  environmentPatch?: ProcessEnvironmentPatch
  nodeLoader?: string
  nodeOptions?: string | null
}

export interface YarnCommandRunOptions {
  input?: 'ignore'
  locator?: Locator
  output?: ProcessOutputPolicy
  prepare?: (
    context: YarnCommandPreparationContext
  ) => Promise<YarnCommandPreparation> | YarnCommandPreparation
  signal?: AbortSignal
  timeout?: number
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
}
