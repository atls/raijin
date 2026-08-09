import type { Options }         from './options.js'

import { npath }                from '@yarnpkg/fslib'

import { scriptUtils }          from '../scripts.js'
import { create as createBase } from './base.js'
import { install }              from './binaries.js'
import { merge }                from './variables.js'
import { set }                  from './variables.js'

export const create = async ({
  baseEnvironment,
  binFolder,
  cwd,
  environmentPatch,
  locator,
  project,
}: Options): Promise<NodeJS.ProcessEnv> => {
  if (locator) {
    await project.restoreInstallState()
  }

  const baseEnv = createBase(project.configuration.env, baseEnvironment, environmentPatch)
  const environment = merge([
    await scriptUtils.makeScriptEnv({
      baseEnv,
      binFolder,
      ignoreCorepack: true,
      locator,
      project,
    }),
  ])

  if (locator) {
    await install({ folder: binFolder, locator, project })
  }

  set(environment, 'INIT_CWD', cwd)
  set(environment, 'PROJECT_CWD', npath.fromPortablePath(project.cwd))

  return environment
}
