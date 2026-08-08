export interface ProcessOutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type ProcessOutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: ProcessOutputEvent) => void }

export type ProcessEnvironmentPatch = Readonly<Record<string, string>>

export interface ProcessExecutionOutput {
  stderr: string
  stdout: string
}

export type ProcessExecutionCompletion =
  | { reason: 'cancelled'; cause: unknown }
  | { reason: 'completed'; exitCode: number }
  | { reason: 'signalled'; cause: unknown; signal?: string }
  | { reason: 'start-failed'; cause: unknown }
  | { reason: 'timed-out'; cause: unknown }

export type ProcessExecutionResult = ProcessExecutionCompletion & ProcessExecutionOutput

export type CompletedProcessExecution = Extract<ProcessExecutionResult, { reason: 'completed' }>

export interface ProcessExecutionOptions {
  input?: 'ignore'
  output?: ProcessOutputPolicy
  timeoutMs?: number
}

export interface ProcessExecutorOptions extends ProcessExecutionOptions {
  cwd: string
  environment: NodeJS.ProcessEnv
}

export interface ProcessExecutor {
  execute: (
    command: string,
    args: ReadonlyArray<string>,
    options: ProcessExecutorOptions
  ) => Promise<ProcessExecutionResult>
}

export interface ProcessInvocation {
  execute: (
    command: string,
    args: Array<string>,
    options?: ProcessExecutionOptions
  ) => Promise<ProcessExecutionResult>
}

export interface ProjectProcessInvocation extends ProcessInvocation {
  readonly project: ProcessInvocation
}
