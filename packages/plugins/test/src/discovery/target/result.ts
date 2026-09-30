import type { stat } from 'node:fs/promises'

export type ExistingLocation = {
  path: string
  stat: Awaited<ReturnType<typeof stat>>
}

export type Failure = {
  error: unknown
}

export type Result = ExistingLocation | Failure
