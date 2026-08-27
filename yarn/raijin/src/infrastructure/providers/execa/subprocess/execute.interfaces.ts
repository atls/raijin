import type { Readable } from 'node:stream'
import type { Writable } from 'node:stream'

export interface Streams {
  stderr: Writable | 'inherit'
  stdin: Readable | 'inherit'
  stdout: Writable | 'inherit'
}

export interface OutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type OutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: OutputEvent) => void }

export interface ExecuteOptions {
  cancelSignal?: AbortSignal
  channel?: {
    input: unknown
  }
  cwd: string
  env: NodeJS.ProcessEnv
  forceKillAfterDelay?: boolean
  input?: 'ignore'
  output?: OutputPolicy
  streams: Streams
  timeoutMs?: number
}

export interface ExecuteOutput {
  messages?: ReadonlyArray<unknown>
  stderr: string
  stdout: string
}

export type ExecuteCompletion =
  | { reason: 'cancelled'; cause: unknown }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'output-failed'; cause: unknown; exitCode: number }
  | { reason: 'signalled'; cause: unknown; signal?: string }
  | { reason: 'start-failed'; cause: unknown }
  | { reason: 'timed-out'; cause: unknown }

export type ExecuteResult = ExecuteCompletion & ExecuteOutput
