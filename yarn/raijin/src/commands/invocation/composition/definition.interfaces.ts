import type { CommandContext }      from '@yarnpkg/core'
import type { Plugin }              from '@yarnpkg/core'

import type { EntryInvocation }     from '../scope/invocation.interfaces.js'
import type { ProjectInvocation }   from '../scope/invocation.interfaces.js'
import type { WorkspaceInvocation } from '../scope/invocation.interfaces.js'

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

type YarnCommandClass = NonNullable<Plugin['commands']>[number]
type CommandExecution = InstanceType<YarnCommandClass>['execute']

interface RegisteredCommand {
  context: CommandContext
  execute: CommandExecution
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
