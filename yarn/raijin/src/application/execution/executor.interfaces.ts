import type { EnvironmentPatch } from './environment.interfaces.js'
import type { OutputPolicy }     from './output.interfaces.js'
import type { ExecuteResult }    from './result.js'

export interface ExecuteInput {
  arguments?: ReadonlyArray<string>
  cancelSignal?: AbortSignal
  cwd: string
  entry: string
  environment?: EnvironmentPatch
  input?: 'ignore' | 'inherit'
  output?: OutputPolicy
  timeoutMs?: number
}

export interface Executor {
  execute: (input: ExecuteInput) => Promise<ExecuteResult>
}
