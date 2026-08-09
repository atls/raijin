import type { Options }                 from './options.js'

import { LOADER }                       from '../../loaders/environment.js'
import { REGISTRATION }                 from '../../loaders/environment.js'
import { REGISTERED_PNP_LOADER }        from '../../loaders/environment.js'
import { Override as VariableOverride } from './override.js'
import { createCanonicalNames }         from '../../../../yarn/environment/variables.js'
import { isDiscarded }                  from '../../../../yarn/environment/variables.js'
import { merge as mergeVariables }      from '../../../../yarn/environment/variables.js'
import { remove as removeVariable }     from '../../../../yarn/environment/variables.js'
import { set as setVariable }           from '../../../../yarn/environment/variables.js'

export const OWNED_NAMES = ['INIT_CWD', 'PROJECT_CWD', LOADER, REGISTRATION, REGISTERED_PNP_LOADER]
const OWNED_NAME_SET = new Set(OWNED_NAMES)
const OWNED_WINDOWS_NAME_SET = new Set(OWNED_NAMES.map((name) => name.toUpperCase()))
const CANONICAL_WINDOWS_NAMES = createCanonicalNames(OWNED_NAMES)

export const remove = (
  environment: NodeJS.ProcessEnv,
  name: string,
  platform: NodeJS.Platform = process.platform
): void => {
  removeVariable(environment, name, platform)
}

export const set = (
  environment: NodeJS.ProcessEnv,
  name: string,
  value: string | undefined,
  platform: NodeJS.Platform = process.platform
): void => {
  setVariable(environment, name, value, platform, CANONICAL_WINDOWS_NAMES)
}

export const merge = (
  environments: ReadonlyArray<NodeJS.ProcessEnv>,
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv => mergeVariables(environments, platform, CANONICAL_WINDOWS_NAMES)

export const applyPatch = (
  environment: NodeJS.ProcessEnv,
  patch: Options['environmentPatch'],
  platform: NodeJS.Platform = process.platform
): void => {
  for (const [name, value] of Object.entries(patch)) {
    const owned =
      platform === 'win32'
        ? OWNED_WINDOWS_NAME_SET.has(name.toUpperCase())
        : OWNED_NAME_SET.has(name)

    if (owned || isDiscarded(name, platform)) {
      throw new VariableOverride(name)
    }

    if (value === undefined) {
      remove(environment, name, platform)
    } else {
      set(environment, name, value, platform)
    }
  }
}
