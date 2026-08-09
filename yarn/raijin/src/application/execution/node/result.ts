import type { Failure as CleanupFailure } from './failures/cleanup.js'
import type { Failure as OutputFailure }  from './failures/output.js'
import type { Failure as StartFailure }   from './failures/start.js'

export interface Output {
  stderr: string
  stdout: string
}

export type Completion =
  | { reason: 'cancelled' }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'output-failed'; exitCode: number; failure: OutputFailure }
  | { reason: 'signalled'; signal?: string }
  | { reason: 'start-failed'; failure: StartFailure }
  | { reason: 'timed-out' }

export type Process = Completion & Output

export interface CleanupFailed {
  execution: Process
  failure: CleanupFailure
  reason: 'cleanup-failed'
}

export type Result = CleanupFailed | Process
