export interface ManagedNodeOutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type ManagedNodeOutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: ManagedNodeOutputEvent) => void }
  | { mode: 'inherit' }

export type ManagedNodeEnvironmentPatch = Readonly<Record<string, string | undefined>>

export interface ManagedNodeExecutionInput {
  arguments?: ReadonlyArray<string>
  cancelSignal?: AbortSignal
  cwd: string
  environment?: ManagedNodeEnvironmentPatch
  input?: 'ignore' | 'inherit'
  output?: ManagedNodeOutputPolicy
  program: string
  timeoutMs?: number
}
