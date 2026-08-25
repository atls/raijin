import type { WorkspaceCommandContext }  from '@atls/raijin/commands'

import type { TypecheckCompletedResult } from '../interfaces/result.js'

import React                             from 'react'

import { TypeScriptDiagnostic }          from '@atls/cli-ui-typescript-diagnostic-component'
import { renderStatic }                  from '@atls/cli-ui-renderer-static-component'

export const writeCompleted = (
  context: Pick<WorkspaceCommandContext, 'stdout'>,
  result: TypecheckCompletedResult
): void => {
  result.diagnostics.forEach((diagnostic) => {
    renderStatic(<TypeScriptDiagnostic {...diagnostic} />)
      .split('\n')
      .forEach((line) => {
        context.stdout.write(`${line}\n`)
      })
  })
}
