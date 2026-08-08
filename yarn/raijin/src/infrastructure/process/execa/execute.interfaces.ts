import type { Readable } from 'node:stream'
import type { Writable } from 'node:stream'

export interface ExecaProcessOutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type ExecaProcessOutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: ExecaProcessOutputEvent) => void }

export interface ExecaProcessContext {
  stderr: Writable | 'inherit'
  stdin: Readable | 'inherit'
  stdout: Writable | 'inherit'
}

export interface ExecaProcessExecutionOptions {
  cancelSignal?: AbortSignal
  context: ExecaProcessContext
  cwd: string
  env: NodeJS.ProcessEnv
  input?: 'ignore'
  output?: ExecaProcessOutputPolicy
  timeoutMs?: number
}

export interface ExecaProcessExecutionOutput {
  stderr: string
  stdout: string
}

export type ExecaProcessExecutionCompletion =
  | { reason: 'cancelled'; cause: unknown }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'signalled'; cause: unknown; signal?: string }
  | { reason: 'start-failed'; cause: unknown }
  | { reason: 'timed-out'; cause: unknown }

export type ExecaProcessExecutionResult = ExecaProcessExecutionCompletion &
  ExecaProcessExecutionOutput
