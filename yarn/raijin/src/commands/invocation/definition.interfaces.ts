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

interface CommandInstance {
  context: CommandContext
}

export interface EntryInvokedCommand extends CommandInstance {
  executeEntry: () => Promise<number | undefined>
}

export interface ProjectInvokedCommand extends CommandInstance {
  executeProject: (invocation: ProjectInvocation) => Promise<number | undefined>
}

export interface WorkspaceInvokedCommand extends CommandInstance {
  executeWorkspace: (invocation: WorkspaceInvocation) => Promise<number | undefined>
}

export type InvokedCommand = EntryInvokedCommand | ProjectInvokedCommand | WorkspaceInvokedCommand
