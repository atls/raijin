import type { CommandContext }               from '@yarnpkg/core'

import type { CommandInvocationForScope }    from './definition.interfaces.js'
import type { CommandInvocationScope }       from './definition.interfaces.js'
import type { EntryInvokedCommand }          from './definition.interfaces.js'
import type { InvokedCommand }               from './definition.interfaces.js'
import type { ProjectInvokedCommand }        from './definition.interfaces.js'
import type { WorkspaceInvokedCommand }      from './definition.interfaces.js'
import type { CommandInvocationExit }        from './resolve.interfaces.js'

import { BaseCommand }                       from '@yarnpkg/cli'

import { resolveEntryCommandInvocation }     from './resolve.js'
import { resolveProjectCommandInvocation }   from './resolve.js'
import { resolveWorkspaceCommandInvocation } from './resolve.js'

interface CommandHandler<Scope extends CommandInvocationScope = CommandInvocationScope> {
  execute: (
    this: InvokedCommand,
    invocation: CommandInvocationForScope<Scope>
  ) => Promise<number | undefined>
  scope: Scope
}

interface CommandHandlers {
  executeEntry?: EntryInvokedCommand['executeEntry']
  executeProject?: ProjectInvokedCommand['executeProject']
  executeWorkspace?: WorkspaceInvokedCommand['executeWorkspace']
}

const isCommandInvocationExit = (value: unknown): value is CommandInvocationExit =>
  typeof value === 'object' && value !== null && 'exitCode' in value

const resolveInvocation = async <Scope extends CommandInvocationScope>(
  scope: Scope,
  context: CommandContext
): Promise<CommandInvocationExit | CommandInvocationForScope<Scope>> => {
  if (scope === 'workspace') {
    return resolveWorkspaceCommandInvocation(context) as Promise<
      CommandInvocationExit | CommandInvocationForScope<Scope>
    >
  }

  if (scope === 'project') {
    return resolveProjectCommandInvocation(context) as Promise<
      CommandInvocationExit | CommandInvocationForScope<Scope>
    >
  }

  return resolveEntryCommandInvocation(context) as CommandInvocationForScope<Scope>
}

const resolveCommandHandler = (command: RaijinCommand): CommandHandler => {
  const invokedCommand = command as CommandHandlers & RaijinCommand
  const handlers = [
    { execute: invokedCommand.executeEntry, scope: 'entry' },
    { execute: invokedCommand.executeProject, scope: 'project' },
    { execute: invokedCommand.executeWorkspace, scope: 'workspace' },
  ].filter((handler): handler is CommandHandler => typeof handler.execute === 'function')

  if (handlers.length !== 1) {
    throw new Error(`${command.constructor.name} must implement exactly one Raijin command handler`)
  }

  return handlers[0]
}

export abstract class RaijinCommand extends BaseCommand {
  override async execute(): Promise<number | undefined> {
    const handler = resolveCommandHandler(this)
    const invocation = await resolveInvocation(handler.scope, this.context)

    if (isCommandInvocationExit(invocation)) {
      return invocation.exitCode
    }

    return handler.execute.call(this as unknown as InvokedCommand, invocation)
  }
}
