import type { CommandContext }      from '@yarnpkg/core'
import type { Plugin }              from '@yarnpkg/core'

import type { EntryInvocation }     from '../scope/interfaces/invocation.js'
import type { ProjectInvocation }   from '../scope/interfaces/invocation.js'
import type { WorkspaceInvocation } from '../scope/interfaces/invocation.js'

export type CommandInvocationScope = 'entry' | 'project' | 'workspace'

export type EntryCommandContext = CommandContext & {
  invocation: EntryInvocation
}

export type ProjectCommandContext = CommandContext & {
  invocation: ProjectInvocation
}

export type WorkspaceCommandContext = CommandContext & {
  invocation: WorkspaceInvocation
}

export interface InvocationPluginConfiguration {
  modules: Map<string, unknown>
}

type YarnCommandClass = NonNullable<Plugin['commands']>[number]
type CommandExecution = InstanceType<YarnCommandClass>['execute']

interface RegisteredCommand {
  context: CommandContext
  execute: CommandExecution
  executeBeforeInvocation?: () => Promise<number | undefined> | number | undefined
}

export type RegisteredCommandClass = YarnCommandClass & {
  readonly prototype: RegisteredCommand
}

interface ScopedCommand<Context extends CommandContext> extends RegisteredCommand {
  context: Context
}

type ScopedCommandClass<Context extends CommandContext> = RegisteredCommandClass &
  (new () => ScopedCommand<Context>)

export interface CommandInvocationDefinitions {
  entry?: Array<ScopedCommandClass<EntryCommandContext>>
  project?: Array<ScopedCommandClass<ProjectCommandContext>>
  workspace?: Array<ScopedCommandClass<WorkspaceCommandContext>>
}
