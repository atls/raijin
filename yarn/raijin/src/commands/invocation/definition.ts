import type { CommandInvocationDefinition } from './definition.interfaces.js'
import type { CommandInvocationScope }      from './definition.interfaces.js'

export const defineCommandInvocation = <Scope extends CommandInvocationScope>(
  definition: CommandInvocationDefinition<Scope>
): CommandInvocationDefinition<Scope> => definition
