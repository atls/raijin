import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TypecheckProjectResult }  from '../interfaces/result.js'

import React                            from 'react'

import { TypeScriptDiagnostic }         from '@atls/cli-ui-typescript-diagnostic-component'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'

export const writeTypecheckResult = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  result: TypecheckProjectResult
): void => {
  if (result.status === 'provider-failed') {
    context.stderr.write(`${result.failure.name}: ${result.failure.message}\n`)

    return
  }

  result.diagnostics.forEach((diagnostic) => {
    const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

    output.split('\n').forEach((line) => {
      context.stdout.write(`${line}\n`)
    })
  })
}
