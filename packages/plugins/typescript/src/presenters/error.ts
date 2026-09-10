import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TypecheckManagedError }   from '../interfaces/result.js'

const formatManagedError = (error: TypecheckManagedError): string =>
  error.reason === 'invalid-policy'
    ? `Invalid typecheckSkipLibCheck in ${error.cwd}: expected boolean.`
    : `TypeScript project not found within ${error.cwd}.`

export const writeManagedError = (
  context: Pick<WorkspaceCommandContext, 'stderr'>,
  error: TypecheckManagedError
): void => {
  context.stderr.write(`${formatManagedError(error)}\n`)
}
