import type { Options }                from './options.js'

import { OWNED_NAMES }                 from './variables.js'
import { create as createEnvironment } from '../../../../yarn/environment/create.js'
import { applyPatch }                  from './variables.js'
import { merge }                       from './variables.js'
import { remove }                      from './variables.js'

export const create = (
  projectEnvironment: NodeJS.ProcessEnv,
  baseEnvironment: NodeJS.ProcessEnv,
  patch: Options['environmentPatch'],
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv => {
  const environment = createEnvironment(
    merge([projectEnvironment, baseEnvironment], platform),
    platform
  )

  for (const name of OWNED_NAMES) {
    remove(environment, name, platform)
  }

  applyPatch(environment, patch, platform)

  return environment
}
