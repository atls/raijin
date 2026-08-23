import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { LintProjectResult }       from '../interfaces/result.js'

export const writeLintResult = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  result: LintProjectResult
): void => {
  if (result.status === 'provider-failed') {
    context.stderr.write(`${result.failure.name}: ${result.failure.message}\n`)

    return
  }

  if (result.output.length > 0) {
    context.stdout.write(result.output)
  }
}
