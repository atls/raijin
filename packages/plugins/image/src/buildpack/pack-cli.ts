import type { CommandExecutionOptions } from './interfaces/executor.js'
import type { CommandExecutionResult }  from './interfaces/executor.js'
import type { CommandExecutor }         from './interfaces/executor.js'

export const execOrThrow = async (
  commandExecutor: CommandExecutor,
  command: string,
  args: Array<string>,
  options?: CommandExecutionOptions
): Promise<CommandExecutionResult> => {
  const result = await commandExecutor.execute(command, args, options)

  if (result.exitCode !== 0) {
    throw new Error(
      `Command "${[command, ...args].join(' ')}" failed with exit code ${result.exitCode}${result.stderr ? `\n${result.stderr}` : ''}`
    )
  }

  return result
}
