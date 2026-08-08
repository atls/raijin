export interface ManagedNodeExecutionOutput {
  stderr: string
  stdout: string
}

export type ManagedNodeProcessCompletion =
  | { reason: 'cancelled'; cause: unknown }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'signalled'; cause: unknown; signal?: string }
  | { reason: 'start-failed'; cause: unknown }
  | { reason: 'timed-out'; cause: unknown }

export type ManagedNodeProcessResult = ManagedNodeExecutionOutput & ManagedNodeProcessCompletion

export interface ManagedNodeCleanupFailedResult {
  cause: unknown
  execution: ManagedNodeProcessResult
  reason: 'cleanup-failed'
}

export type ManagedNodeExecutionResult = ManagedNodeCleanupFailedResult | ManagedNodeProcessResult
