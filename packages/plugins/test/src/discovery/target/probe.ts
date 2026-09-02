import { stat } from 'node:fs/promises'

export type ExistingLocation = {
  path: string
  stat: Awaited<ReturnType<typeof stat>>
}

type ProbeFailure = {
  error: unknown
}

export type ProbeResult = ExistingLocation | ProbeFailure

export const isExistingLocation = (result: ProbeResult): result is ExistingLocation =>
  'stat' in result

const isMissingPathError = (error: unknown): boolean =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')

export const isUnexpectedFailure = (result: ProbeResult): result is ProbeFailure =>
  'error' in result && !isMissingPathError(result.error)

export const probePath = async (path: string): Promise<ProbeResult> => {
  try {
    return {
      path,
      stat: await stat(path),
    }
  } catch (error) {
    return { error }
  }
}
