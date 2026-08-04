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

export type CommandEnvironmentPatch = Readonly<Record<string, string>>

export type CommandNodeOptionsTransformer = (
  nodeOptions: string | undefined
) => Promise<string | undefined> | string | undefined

interface CommandExecutionExit {
  exitCode: number
  signal?: never
  termination: 'exit'
  timedOut: false
}

interface CommandExecutionOutput {
  stderr: string
  stdout: string
}

interface CommandExecutionSignal {
  exitCode: number
  signal: NodeJS.Signals
  termination: 'signal'
  timedOut: false
}

interface CommandExecutionTimeout {
  exitCode: 124
  signal?: never
  termination: 'timeout'
  timedOut: true
}

type CommandExecutionTermination =
  | CommandExecutionExit
  | CommandExecutionSignal
  | CommandExecutionTimeout

export type CommandExecutionResult = CommandExecutionOutput & CommandExecutionTermination

export interface YarnCommandPreparationContext {
  binFolder: PortablePath
  nodeOptions: string | undefined
}

export interface YarnCommandPreparation {
  environmentPatch?: CommandEnvironmentPatch
  nodeLoader?: string
  nodeOptions?: string | null
}

export interface YarnCommandRunOptions {
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
  input?: 'ignore' | 'inherit'
  nodeOptions?: CommandNodeOptionsTransformer
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
