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

export type ExecuteResult = CleanupFailed | Execution
