import type { RaijinProjectModel }     from '@atls/raijin/project'
import type { Configuration }          from '@yarnpkg/core'
import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'
import type { ChildProcess }           from 'node:child_process'
import type { Readable }               from 'node:stream'
import type { Writable }               from 'node:stream'

import type { YarnExecutable }         from './adapters/yarn/execution.interfaces.js'
import type { YarnExecutableOptions }  from './adapters/yarn/execution.interfaces.js'

export interface YarnCommandRunOptions {
  stderr: Writable
  stdin: Readable
  stdout: Writable
  env?: NodeJS.ProcessEnv
}

export interface YarnRuntimeInvocation {
  configuration: Configuration
  project: YarnProject
  createExecutable: (options: Omit<YarnExecutableOptions, 'project'>) => Promise<YarnExecutable>
  execute: (args: Array<string>, options: YarnCommandRunOptions) => Promise<number>
}

export interface ChildProcessRunOptions {
  env: NodeJS.ProcessEnv
  stdio: Array<Readable | Writable | 'ignore' | 'pipe'>
}

export interface ChildProcessInvocation {
  spawn: (command: string, args: Array<string>, options: ChildProcessRunOptions) => ChildProcess
  wait: (child: ChildProcess) => Promise<number>
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
