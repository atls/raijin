type Output = {
  stderr: string
  stdout: string
}

type Completion =
  | { reason: 'cancelled' }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'output-failed'; exitCode: number }
  | { reason: 'signalled'; signal?: string }
  | { reason: 'start-failed' }
  | { reason: 'timed-out' }

type Process = Completion & Output

type CleanupFailed = {
  execution: Process
  reason: 'cleanup-failed'
}

export type Result = CleanupFailed | Process
