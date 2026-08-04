import type { PluginConfiguration }          from '@yarnpkg/core'
import type { CommandContext }               from '@yarnpkg/core'

import type { CommandInvocationDefinition }  from './definition.interfaces.js'
import type { CommandInvocationForScope }    from './definition.interfaces.js'
import type { CommandInvocationScope }       from './definition.interfaces.js'
import type { CommandClass }                 from './definition.interfaces.js'
import type { InvokedCommand }               from './definition.interfaces.js'
import type { CommandInvocationExit }        from './resolve.interfaces.js'

import { resolveProjectCommandInvocation }   from './resolve.js'
import { resolveWorkspaceCommandInvocation } from './resolve.js'

interface MutablePlugin {
  commands?: Array<CommandClass>
  default?: MutablePlugin
}

const COMPOSED_COMMAND = Symbol('raijin.composed.command')
const STATIC_PROPERTIES = ['name', 'length', 'prototype']

const isCommandInvocationExit = (value: unknown): value is CommandInvocationExit =>
  typeof value === 'object' && value !== null && 'exitCode' in value

const resolveInvocation = async <Scope extends CommandInvocationScope>(
  definition: CommandInvocationDefinition<Scope>,
  context: CommandContext
): Promise<CommandInvocationExit | CommandInvocationForScope<Scope>> => {
  if (definition.scope === 'workspace') {
    return resolveWorkspaceCommandInvocation(context.cwd, context.plugins) as Promise<
      CommandInvocationExit | CommandInvocationForScope<Scope>
    >
  }

  if (definition.scope === 'project') {
    return resolveProjectCommandInvocation(context.cwd, context.plugins) as Promise<
      CommandInvocationExit | CommandInvocationForScope<Scope>
    >
  }

  return undefined as CommandInvocationForScope<Scope>
}

export const composeCommandClass = <Scope extends CommandInvocationScope>(
  commandClass: CommandClass<Scope>
): CommandClass<Scope> => {
  const definition = commandClass.raijinCommand

  if (!definition || Reflect.get(commandClass, COMPOSED_COMMAND)) {
    return commandClass
  }
  const commandDefinition = definition
  const execute = commandClass.prototype.execute as (
    this: InvokedCommand<Scope>,
    invocation: CommandInvocationForScope<Scope>
  ) => Promise<number | undefined>

  class ComposedCommand extends commandClass {
    override execute = async (): Promise<number | undefined> => {
      const invocation = await resolveInvocation(commandDefinition, this.context)

      if (isCommandInvocationExit(invocation)) {
        return invocation.exitCode
      }

      return execute.call(this, invocation)
    }
  }

  for (const property of [
    ...Object.getOwnPropertyNames(commandClass),
    ...Object.getOwnPropertySymbols(commandClass),
  ]) {
    if (typeof property === 'string' && STATIC_PROPERTIES.includes(property)) continue

    const descriptor = Reflect.getOwnPropertyDescriptor(commandClass, property)

    if (descriptor) {
      Reflect.defineProperty(ComposedCommand, property, descriptor)
    }
  }

  Reflect.set(ComposedCommand, COMPOSED_COMMAND, true)

  return ComposedCommand
}

export const composePluginConfigurationCommands = (
  pluginConfiguration: PluginConfiguration
): PluginConfiguration => {
  for (const [pluginName, plugin] of pluginConfiguration.modules) {
    if (!pluginName.startsWith('@atls/yarn-plugin-')) continue

    const pluginModule = plugin as MutablePlugin
    const pluginDefinition = pluginModule.default ?? pluginModule
    const commands = pluginDefinition.commands ?? []

    if (commands.length === 0) continue

    pluginDefinition.commands = commands.map((commandClass) => composeCommandClass(commandClass))
  }

  return pluginConfiguration
}
