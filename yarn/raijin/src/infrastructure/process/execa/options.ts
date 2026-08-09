import type { OutputPolicy } from './output.js'
import type { Streams }      from './streams.js'

export interface ExecuteOptions {
  cancelSignal?: AbortSignal
  cwd: string
  env: NodeJS.ProcessEnv
  input?: 'ignore'
  output?: OutputPolicy
  streams: Streams
  timeoutMs?: number
}
