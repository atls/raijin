import type { PortablePath } from '@yarnpkg/fslib'

export interface CommandExecutionOptions {
  capture?: boolean
}

export interface CommandExecutionResult {
  exitCode: number
  stderr: string
  stdout: string
}

export interface CommandExecutor {
  readonly cwd: PortablePath
  execute: (
    command: string,
    args: Array<string>,
    options?: CommandExecutionOptions
  ) => Promise<CommandExecutionResult>
}
