import type { ExistingLocation } from './result.js'
import type { Result }           from './result.js'

import { stat }                  from 'node:fs/promises'

export const isExistingLocation = (result: Result): result is ExistingLocation => 'stat' in result

const isMissingPathError = (error: unknown): boolean =>
  !!(error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT')

export const isUnexpectedFailure = (result: Result): boolean =>
  'error' in result && !isMissingPathError(result.error)

export const probePath = async (path: string): Promise<Result> => {
  try {
    return {
      path,
      stat: await stat(path),
    }
  } catch (error) {
    return { error }
  }
}
