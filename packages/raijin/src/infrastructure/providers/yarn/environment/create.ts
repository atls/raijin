import type { Input }   from './create.interfaces.js'

import { scriptUtils }  from '@yarnpkg/core'
import { npath }        from '@yarnpkg/fslib'

import { applyPatch }   from '../../../process/environment/map.js'
import { createNames }  from '../../../process/environment/map.js'
import { includesName } from '../../../process/environment/map.js'
import { merge }        from '../../../process/environment/map.js'
import { remove }       from '../../../process/environment/map.js'
import { set }          from '../../../process/environment/map.js'

const OWNED_ENVIRONMENT_NAMES = ['INIT_CWD', 'PROJECT_CWD']
const CANONICAL_ENVIRONMENT_NAMES = createNames(OWNED_ENVIRONMENT_NAMES)

const assertEnvironmentPatch = (patch: Input['patch']): void => {
  for (const name of Object.keys(patch)) {
    if (includesName(OWNED_ENVIRONMENT_NAMES, name)) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }
  }
}

export const create = async ({
  baseEnvironment = process.env,
  binDirectory,
  cwd,
  locator,
  patch,
  project,
}: Input): Promise<NodeJS.ProcessEnv> => {
  const binFolder = npath.toPortablePath(binDirectory)

  if (locator) {
    await project.restoreInstallState()
  }

  assertEnvironmentPatch(patch)

  const baseEnv = merge([project.configuration.env, baseEnvironment])

  for (const name of OWNED_ENVIRONMENT_NAMES) {
    remove(baseEnv, name)
  }

  applyPatch(baseEnv, patch)

  const environment = merge([
    await scriptUtils.makeScriptEnv({
      baseEnv,
      binFolder,
      ignoreCorepack: true,
      locator,
      project,
    }),
  ])

  set(environment, 'INIT_CWD', cwd, process.platform, CANONICAL_ENVIRONMENT_NAMES)
  set(
    environment,
    'PROJECT_CWD',
    npath.fromPortablePath(project.cwd),
    process.platform,
    CANONICAL_ENVIRONMENT_NAMES
  )

  return environment
}
