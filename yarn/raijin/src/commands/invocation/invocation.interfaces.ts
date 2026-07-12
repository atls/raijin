import type { Configuration }          from '@yarnpkg/core'
import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { Locator }                from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'
import type { SpawnOptions }           from 'node:child_process'
import type { Readable }               from 'node:stream'
import type { Writable }               from 'node:stream'

export type CommandPluginConfiguration = Parameters<typeof Configuration.find>[1]

export interface CommandPath {
  readonly native: string
  readonly portable: PortablePath
}

export interface CommandInvocationCwds {
  readonly execution: CommandPath
  readonly invocation: CommandPath
  readonly project: CommandPath
}

export interface ProjectCommandInvocation {
  readonly configuration: Configuration
  readonly cwd: CommandInvocationCwds
  readonly project: YarnProject
}

export interface WorkspaceCommandInvocation extends ProjectCommandInvocation {
  readonly workspace: Workspace
}

export interface CommandStreams {
  stderr: Writable
  stdin: Readable
  stdout: Writable
}

export interface YarnCommandExecutableOptions {
  binFolder: PortablePath
  project: YarnProject
  locator?: Locator
  env?: NodeJS.ProcessEnv
  nodeLoader?: string
}

export interface YarnCommandExecutable {
  env: NodeJS.ProcessEnv
  executable: string
}

export interface YarnCommandOptions extends CommandStreams {
  args: Array<string>
  invocation: ProjectCommandInvocation
  env?: NodeJS.ProcessEnv
}

export interface CommandProxyOptions extends CommandStreams {
  args: Array<string>
  cwd: PortablePath
  plugins: CommandPluginConfiguration
  env?: NodeJS.ProcessEnv
}

export interface CommandChildOptions {
  invocation: ProjectCommandInvocation
  env: NodeJS.ProcessEnv
  stdio: SpawnOptions['stdio']
}
