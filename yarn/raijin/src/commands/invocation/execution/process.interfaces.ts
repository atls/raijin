export interface ProcessOutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type ProcessOutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: ProcessOutputEvent) => void }

export type ProcessEnvironmentPatch = Readonly<Record<string, string>>

export type ProcessNodeOptionsTransformer = (
  nodeOptions: string | undefined
) => Promise<string | undefined> | string | undefined

export interface ProcessExecutionResult {
  exitCode: number
  stderr: string
  stdout: string
}

export interface ProcessExecutionOptions {
  input?: 'ignore'
  nodeOptions?: ProcessNodeOptionsTransformer
  output?: ProcessOutputPolicy
  scope?: 'project'
  signal?: AbortSignal
  timeout?: number
}

export interface ProcessInvocation {
  execute: (
    command: string,
    args: Array<string>,
    options?: ProcessExecutionOptions
  ) => Promise<ProcessExecutionResult>
}
