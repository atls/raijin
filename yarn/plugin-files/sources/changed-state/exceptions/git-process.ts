import type { ProcessExecutionResult } from '@atls/raijin/commands'

import type { GitChangedStateSource } from '../interfaces/source.js'

type GitOperation =
  | 'inspect-history'
  | 'resolve-diff'
  | 'resolve-shallow-history'
  | 'resolve-untracked-files'
  | 'validate-comparison'

export class GitProcessException extends Error {
  constructor(
    readonly operation: GitOperation,
    readonly source: GitChangedStateSource,
    readonly result: ProcessExecutionResult
  ) {
    super(`Git ${operation} failed for ${source.kind} changed state`, {
      cause: result.reason === 'completed' ? result : result.cause,
    })
    this.name = 'GitProcessException'
  }
}
