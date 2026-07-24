import type { Project }           from '@yarnpkg/core'

import { applyManagedNodeLoader } from '@atls/raijin/runtime/node/bootstrap'

export const setupScriptEnvironment = async (
  _project: Project,
  env: NodeJS.ProcessEnv
): Promise<void> => {
  applyManagedNodeLoader(env)
}
