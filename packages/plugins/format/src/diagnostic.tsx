import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import React                            from 'react'

import { ErrorInfo }                    from '@atls/cli-ui-error-info-component'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'

export const writeDiagnostic = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  error: unknown
): void => {
  if (error instanceof Error) {
    context.stdout.write(`${renderStatic(<ErrorInfo error={error} />)}\n`)

    return
  }

  context.stderr.write(`${String(error)}\n`)
}
