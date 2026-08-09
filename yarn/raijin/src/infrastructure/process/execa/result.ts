export interface Output {
  stderr: string
  stdout: string
}

export type Completion =
  | { reason: 'cancelled'; cause: unknown }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'output-failed'; cause: unknown; exitCode: number }
  | { reason: 'signalled'; cause: unknown; signal?: string }
  | { reason: 'start-failed'; cause: unknown }
  | { reason: 'timed-out'; cause: unknown }

export type ExecuteResult = Completion & Output
