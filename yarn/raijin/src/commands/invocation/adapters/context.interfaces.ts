import type { CommandContext } from '@yarnpkg/core'

export interface InvocationAdapterContext {
  environment: CommandContext['env']
  stderr: CommandContext['stderr']
  stdin: CommandContext['stdin']
  stdout: CommandContext['stdout']
}
