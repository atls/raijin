import type { ApplicationExecutionResult } from '@atls/raijin/commands'
import type { ApplicationInvocation }      from '@atls/raijin/commands'

import { resolveCompletedArtifact }        from '../build/artifact.js'

export interface StartProjectInput {
  application: ApplicationInvocation
  cwd: string
}

export type StartProjectResult =
  | { execution: ApplicationExecutionResult; status: 'executed' }
  | { status: 'artifact-missing' }

export const startProject = async ({
  application,
  cwd,
}: StartProjectInput): Promise<StartProjectResult> => {
  const entry = await resolveCompletedArtifact(cwd)

  if (!entry) {
    return { status: 'artifact-missing' }
  }

  return {
    execution: await application.execute({ cwd, entry, output: { mode: 'inherit' } }),
    status: 'executed',
  }
}
