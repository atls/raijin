import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TypecheckManagedError }   from '../interfaces/result.js'

const formatManagedError = (error: TypecheckManagedError): string =>
  error.reason === 'invalid-policy'
    ? `Invalid typecheckSkipLibCheck in ${error.cwd}: expected boolean.`
    : `TypeScript project not found in ${error.cwd}; provide explicit files.`

export const writeManagedError = (
  context: Pick<WorkspaceCommandContext, 'stderr'>,
  error: TypecheckManagedError
): void => {
  context.stderr.write(`${formatManagedError(error)}\n`)
}
