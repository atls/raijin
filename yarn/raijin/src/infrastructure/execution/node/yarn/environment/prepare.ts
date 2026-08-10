import type { CreateOptions }           from './create.interfaces.js'

import { LOADER }                       from '../../loaders/environment.js'
import { REGISTRATION }                 from '../../loaders/environment.js'
import { REGISTERED_PNP_LOADER }        from '../../loaders/environment.js'
import { Override as VariableOverride } from './override.js'
import { createNames }                  from '../../../../process/environment/map.js'
import { merge }                        from '../../../../process/environment/map.js'
import { remove }                       from '../../../../process/environment/map.js'
import { set }                          from '../../../../process/environment/map.js'
import { isOwned as isYarnOwned }       from '../../../../yarn/environment/sanitize.js'
import { sanitize }                     from '../../../../yarn/environment/sanitize.js'

const OWNED_NAMES = ['INIT_CWD', 'PROJECT_CWD', LOADER, REGISTRATION, REGISTERED_PNP_LOADER]
const OWNED_NAME_SET = new Set(OWNED_NAMES)
const OWNED_WINDOWS_NAME_SET = new Set(OWNED_NAMES.map((name) => name.toUpperCase()))
const CANONICAL_NAMES = createNames(OWNED_NAMES)

const isOwned = (name: string, platform: NodeJS.Platform): boolean =>
  platform === 'win32' ? OWNED_WINDOWS_NAME_SET.has(name.toUpperCase()) : OWNED_NAME_SET.has(name)

const applyPatch = (
  environment: NodeJS.ProcessEnv,
  patch: CreateOptions['environmentPatch'],
  platform: NodeJS.Platform
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (isOwned(name, platform) || isYarnOwned(name, platform)) {
      throw new VariableOverride(name)
    }

    if (value === undefined) {
      remove(environment, name, platform)
    } else {
      set(environment, name, value, platform, CANONICAL_NAMES)
    }
  }
}

export const prepare = (
  projectEnvironment: NodeJS.ProcessEnv,
  baseEnvironment: NodeJS.ProcessEnv,
  patch: CreateOptions['environmentPatch'],
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv => {
  const environment = sanitize(
    merge([projectEnvironment, baseEnvironment], platform, CANONICAL_NAMES),
    platform
  )

  for (const name of OWNED_NAMES) {
    remove(environment, name, platform)
  }

  applyPatch(environment, patch, platform)

  return environment
}
