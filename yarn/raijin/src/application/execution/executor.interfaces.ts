import type { EnvironmentPatch } from './environment.interfaces.js'
import type { OutputPolicy }     from './output.interfaces.js'

type Output = {
  stderr: string
  stdout: string
}

type Execution = Output &
  (
    | { reason: 'cancelled' }
    | { reason: 'completed'; exitCode: number }
    | { reason: 'output-failed'; exitCode: number }
    | { reason: 'signalled'; signal?: string }
    | { reason: 'start-failed' }
    | { reason: 'timed-out' }
  )

type CleanupFailed = {
  execution: Execution
  reason: 'cleanup-failed'
}

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

export type ExecuteResult = CleanupFailed | Execution
