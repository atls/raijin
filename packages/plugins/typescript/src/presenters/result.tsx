import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TypecheckProjectResult }  from '../typecheck.js'

import React                            from 'react'

import { TypeScriptDiagnostic }         from '@atls/cli-ui-typescript-diagnostic-component'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'

export const writeTypecheckResult = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  result: TypecheckProjectResult
): void => {
  if (result.status === 'invalid-policy') {
    context.stderr.write(
      `Invalid ${result.policy} in ${result.cwd}: expected ${result.expected}.\n`
    )

    return
  }

  if (result.status === 'internal-failed') {
    result.missingConfigPaths.forEach((path) => {
      context.stderr.write(`TypeScript project graph is missing configured project ${path}.\n`)
    })

    return
  }

  if (result.status === 'provider-failed') {
    context.stderr.write(`${result.failure.name}: ${result.failure.message}\n`)

    return
  }

  if (result.status === 'missing-project') {
    context.stderr.write(`TypeScript project not found in ${result.cwd}; provide explicit files.\n`)

    return
  }

  if (result.status === 'unresolved-target') {
    result.targets.forEach(({ request }) => {
      context.stderr.write(`TypeScript target is not owned by a configured project: ${request}\n`)
    })

    return
  }

  result.diagnostics.forEach((diagnostic) => {
    const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

    output.split('\n').forEach((line) => {
      context.stdout.write(`${line}\n`)
    })
  })
}
