import type { ProcessExecutionOptions } from './capabilities/interfaces/process.js'
import type { ProcessExecutionResult }  from './capabilities/interfaces/process.js'

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
