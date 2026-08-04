import type { CommandContext }      from '@yarnpkg/core'

import type { ProjectInvocation }   from './resolve.interfaces.js'
import type { WorkspaceInvocation } from './resolve.interfaces.js'

export type CommandInvocationScope = 'entry' | 'project' | 'workspace'

export type CommandInvocationForScope<Scope extends CommandInvocationScope> =
  Scope extends 'workspace'
    ? WorkspaceInvocation
    : Scope extends 'project'
      ? ProjectInvocation
      : undefined

export interface CommandInvocationDefinition<Scope extends CommandInvocationScope> {
  readonly scope: Scope
}

export interface InvokedCommand<Scope extends CommandInvocationScope> {
  context: CommandContext
  execute: (invocation: CommandInvocationForScope<Scope>) => Promise<number | undefined>
}

export interface CommandClass<Scope extends CommandInvocationScope = CommandInvocationScope> {
  readonly prototype: InvokedCommand<Scope>
  readonly raijinCommand?: CommandInvocationDefinition<Scope>
  new (): InvokedCommand<Scope>
}
