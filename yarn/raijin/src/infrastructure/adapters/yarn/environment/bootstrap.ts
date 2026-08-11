import type * as YarnCore         from '@yarnpkg/core'

import type { Environment }       from '../../node/execution/environment.interfaces.js'
import type { EnvironmentInput }  from '../../node/execution/environment.interfaces.js'
import type { BootstrapOptions }  from './bootstrap.interfaces.js'

import { createRequire }          from 'node:module'

import { npath }                  from '@yarnpkg/fslib'

import { merge }                  from '../../../process/environment/map.js'
import { set }                    from '../../../process/environment/map.js'
import { prepare as prepareBase } from './prepare.js'

const require = createRequire(import.meta.url)
const { scriptUtils } = require('@yarnpkg/core') as Pick<typeof YarnCore, 'scriptUtils'>

const prepare = async (
  input: EnvironmentInput,
  { baseEnvironment = process.env, locator, project }: BootstrapOptions
): Promise<NodeJS.ProcessEnv> => {
  const binFolder = npath.toPortablePath(input.binDirectory)

  if (locator) {
    await project.restoreInstallState()
  }

  const baseEnv = prepareBase(project.configuration.env, baseEnvironment, input.patch)
  const environment = merge([
    await scriptUtils.makeScriptEnv({
      baseEnv,
      binFolder,
      ignoreCorepack: true,
      locator,
      project,
    }),
  ])

  set(environment, 'INIT_CWD', input.cwd)
  set(environment, 'PROJECT_CWD', npath.fromPortablePath(project.cwd))

  return environment
}

export const create = (options: BootstrapOptions): Environment => ({
  prepare: async (input) => prepare(input, options),
})
