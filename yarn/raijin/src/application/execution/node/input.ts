export interface OutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type OutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: OutputEvent) => void }
  | { mode: 'inherit' }

export type EnvironmentPatch = Readonly<Record<string, string | undefined>>

export interface Input {
  arguments?: ReadonlyArray<string>
  cancelSignal?: AbortSignal
  cwd: string
  environment?: EnvironmentPatch
  input?: 'ignore' | 'inherit'
  output?: OutputPolicy
  program: string
  timeoutMs?: number
}
