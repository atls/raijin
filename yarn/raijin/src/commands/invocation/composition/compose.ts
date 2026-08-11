import type { CommandContext }                from '@yarnpkg/core'
import type { PluginConfiguration }           from '@yarnpkg/core'

import type { EntryInvocation }               from '../scope/invocation.interfaces.js'
import type { ProjectInvocation }             from '../scope/invocation.interfaces.js'
import type { WorkspaceInvocation }           from '../scope/invocation.interfaces.js'
import type { CommandInvocationScope }        from './definition.interfaces.js'
import type { InvocationPluginConfiguration } from './definition.interfaces.js'
import type { RegisteredCommandClass }        from './definition.interfaces.js'

import { create as createProcessExecutor } from '../../../infrastructure/process/execa/executor.js'
import { resolveEntryCommandInvocation }      from '../scope/entry.js'
import { resolveProjectCommandInvocation }    from '../scope/project.js'
import { resolveWorkspaceCommandInvocation }  from '../scope/workspace.js'
import { getCommandInvocationScope }          from './definition.js'

const COMPOSED_COMMAND = Symbol.for('@atls/raijin.command-invocation.composed')

const isObject = (value: unknown): value is object =>
  (typeof value === 'object' && value !== null) || typeof value === 'function'

const isRegisteredCommand = (value: unknown): value is RegisteredCommandClass =>
  typeof value === 'function'

const resolvePlugin = (pluginModule: unknown): object | undefined => {
  if (!isObject(pluginModule)) {
    return undefined
  }

  const defaultExport: unknown = Reflect.get(pluginModule, 'default')

  return isObject(defaultExport) ? defaultExport : pluginModule
}

const resolveInvocation = (
  scope: CommandInvocationScope,
  context: CommandContext
): EntryInvocation | Promise<ProjectInvocation | WorkspaceInvocation> => {
  const executor = createProcessExecutor(context)

  if (scope === 'workspace') {
    return resolveWorkspaceCommandInvocation(context, executor)
  }

  if (scope === 'project') {
    return resolveProjectCommandInvocation(context, executor)
  }

  return resolveEntryCommandInvocation(context, executor)
}

const composeCommand = (command: RegisteredCommandClass): RegisteredCommandClass => {
  const scope = getCommandInvocationScope(command)

  if (!scope || Reflect.get(command, COMPOSED_COMMAND)) {
    return command
  }

  const commandScope = scope
  const { execute } = command.prototype

  class ComposedCommand extends command {
    async execute() {
      const invocation = await resolveInvocation(commandScope, this.context)
      const context = { ...this.context, invocation }

      this.context = context

      return execute.call(this)
    }
  }

  Reflect.defineProperty(ComposedCommand, COMPOSED_COMMAND, { value: true })

  return ComposedCommand
}

export const composeCommandInvocations = (
  pluginConfiguration: PluginConfiguration
): PluginConfiguration => {
  const { modules }: InvocationPluginConfiguration = pluginConfiguration

  for (const pluginModule of modules.values()) {
    const plugin = resolvePlugin(pluginModule)

    if (!plugin) {
      continue
    }

    const commands: unknown = Reflect.get(plugin, 'commands')

    if (Array.isArray(commands) && commands.every(isRegisteredCommand)) {
      Reflect.set(plugin, 'commands', commands.map(composeCommand))
    }
  }

  return pluginConfiguration
}
