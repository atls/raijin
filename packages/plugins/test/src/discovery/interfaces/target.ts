import type { stat } from 'node:fs/promises'

export type TargetStat = Awaited<ReturnType<typeof stat>>

export type ExistingTargetPath = {
  path: string
  stat: TargetStat
}

export type MissingTargetPath = {
  error: unknown
}

export type TargetPathResult = ExistingTargetPath | MissingTargetPath
