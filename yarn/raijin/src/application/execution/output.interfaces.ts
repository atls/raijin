export interface OutputEvent {
  data: string
  source: 'stderr' | 'stdout'
}

export type OutputPolicy =
  | { mode: 'capture'; forward?: boolean }
  | { mode: 'handle'; handler: (event: OutputEvent) => void }
  | { mode: 'inherit' }
