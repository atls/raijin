import type { RaijinProjectModel }     from '@atls/raijin/project'
import type { Configuration }          from '@yarnpkg/core'
import type { Locator }                from '@yarnpkg/core'
import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

export interface CommandOutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type CommandOutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: CommandOutputEvent) => void }
  | { mode: 'inherit' }

export type CommandEnvironmentFactory = (
  environment: NodeJS.ProcessEnv
) => NodeJS.ProcessEnv | Promise<NodeJS.ProcessEnv>

export interface CommandExecutionResult {
  exitCode: number
  stderr: string
  stdout: string
  timedOut: boolean
}

export interface YarnCommandPreparationContext {
  binFolder: PortablePath
  environment: NodeJS.ProcessEnv
}

export interface YarnCommandPreparation {
  environment?: NodeJS.ProcessEnv
  finalizeEnvironment?: CommandEnvironmentFactory
  nodeLoader?: string
}

export interface YarnCommandRunOptions {
  environment?: NodeJS.ProcessEnv
  input?: 'ignore' | 'inherit'
  locator?: Locator
  output?: CommandOutputPolicy
  prepare?: (
    context: YarnCommandPreparationContext
  ) => Promise<YarnCommandPreparation> | YarnCommandPreparation
  timeout?: number
}

export interface YarnCommandCaptureOptions extends Omit<YarnCommandRunOptions, 'output'> {
  forwardOutput?: boolean
}

export interface YarnRuntimeInvocation {
  configuration: Configuration
  project: YarnProject
  capture: (
    args: Array<string>,
    options?: YarnCommandCaptureOptions
  ) => Promise<CommandExecutionResult>
  execute: (args: Array<string>, options?: YarnCommandRunOptions) => Promise<number>
}

export interface ChildProcessRunOptions {
  environment?: CommandEnvironmentFactory
  input?: 'ignore' | 'inherit'
  output?: CommandOutputPolicy
  timeout?: number
}

export interface ChildProcessInvocation {
  execute: (
    command: string,
    args: Array<string>,
    options?: ChildProcessRunOptions
  ) => Promise<CommandExecutionResult>
}

export interface ProjectInvocation {
  readonly executionCwd: PortablePath
  readonly invocationCwd: PortablePath
  readonly child: ChildProcessInvocation
  readonly project: RaijinProjectModel<Workspace>
  readonly yarn: YarnRuntimeInvocation
}

export interface WorkspaceInvocation extends ProjectInvocation {
  readonly workspace: Workspace
}

export interface CommandInvocationExit {
  readonly exitCode: number
}

export type CommandInvocationResolution<Invocation extends ProjectInvocation> =
  | CommandInvocationExit
  | Invocation
