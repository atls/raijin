import type { CommandInvocationScope }       from '../definition.interfaces.js'
import type { CommandInvocationDefinitions } from './definition.interfaces.js'
import type { RegisteredCommandClass }       from './definition.interfaces.js'

const COMMAND_INVOCATION_SCOPE = Symbol.for('@atls/raijin.command-invocation.scope')

const registerCommands = (
  target: Array<RegisteredCommandClass>,
  scope: CommandInvocationScope,
  commands: Array<RegisteredCommandClass>
): void => {
  for (const command of commands) {
    Reflect.defineProperty(command, COMMAND_INVOCATION_SCOPE, { value: scope })
    target.push(command)
  }
}

export const defineCommandInvocations = ({
  entry = [],
  project = [],
  workspace = [],
}: CommandInvocationDefinitions): Array<RegisteredCommandClass> => {
  const commands: Array<RegisteredCommandClass> = []

  registerCommands(commands, 'entry', entry)
  registerCommands(commands, 'project', project)
  registerCommands(commands, 'workspace', workspace)

  return commands
}

export const getCommandInvocationScope = (
  command: RegisteredCommandClass
): CommandInvocationScope | undefined => {
  const scope: unknown = Reflect.get(command, COMMAND_INVOCATION_SCOPE)

  return scope === 'entry' || scope === 'project' || scope === 'workspace' ? scope : undefined
}
