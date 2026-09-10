import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { LibraryDiagnostic }       from './diagnostic.js'
import type { LibraryBuildResult }      from './result.js'

import React                            from 'react'

import { ErrorInfo }                    from '@atls/cli-ui'
import { TypeScriptDiagnostic }         from '@atls/cli-ui'
import { renderStatic }                 from '@atls/cli-ui'

const writeLines = (stream: NodeJS.WritableStream, output: string): void => {
  output.split('\n').forEach((line) => stream.write(`${line}\n`))
}

const writeDiagnostic = (
  stream: NodeJS.WritableStream,
  cwd: string,
  diagnostic: LibraryDiagnostic
): void => {
  writeLines(stream, renderStatic(<TypeScriptDiagnostic {...diagnostic} cwd={cwd} />))
}

export const writeBuildResult = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  cwd: string,
  result: LibraryBuildResult
): void => {
  result.diagnostics.forEach((diagnostic) => writeDiagnostic(context.stdout, cwd, diagnostic))

  if (result.kind === 'artifact-invalid') {
    context.stderr.write(
      `Library artifact verification failed for ${result.targetRoot}: ${result.issues.join(', ')}.\n`
    )
  }
}

export const writeBuildException = (
  context: Pick<WorkspaceCommandContext, 'stderr'>,
  error: unknown
): void => {
  const exception = error instanceof Error ? error : new Error(String(error))

  writeLines(context.stderr, renderStatic(<ErrorInfo error={exception} />))
}
