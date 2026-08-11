import type { ProcessExecutionOptions } from './capabilities/process.interfaces.js'
import type { ProcessExecutionResult }  from './capabilities/process.interfaces.js'

export interface ExecuteOptions extends ProcessExecutionOptions {
  cwd: string
  environment: NodeJS.ProcessEnv
}

export interface Executor {
  execute: (
    command: string,
    args: ReadonlyArray<string>,
    options: ExecuteOptions
  ) => Promise<ProcessExecutionResult>
}
