import type { WorkspaceCommandContext } from '@atls/raijin/commands'

export const writeLintException = (
  context: Pick<WorkspaceCommandContext, 'stderr'>,
  error: unknown
): void => {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

  context.stderr.write(`${message}\n`)
}
