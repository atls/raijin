import type * as YarnCore        from '@yarnpkg/core'

import type { Environment }      from '../../node/execution/environment.interfaces.js'
import type { EnvironmentInput } from '../../node/execution/environment.interfaces.js'
import type { BootstrapOptions } from './bootstrap.interfaces.js'

import { createRequire }         from 'node:module'

import { npath }                 from '@yarnpkg/fslib'

import { applyPatch }            from '../../../process/environment/map.js'
import { includesName }          from '../../../process/environment/map.js'
import { merge }                 from '../../../process/environment/map.js'
import { remove }                from '../../../process/environment/map.js'
import { set }                   from '../../../process/environment/map.js'

const require = createRequire(import.meta.url)
const { scriptUtils } = require('@yarnpkg/core') as Pick<typeof YarnCore, 'scriptUtils'>

const BOOTSTRAP_ENVIRONMENT_NAMES = ['INIT_CWD', 'PROJECT_CWD']

const assertEnvironmentPatch = (patch: EnvironmentInput['patch']): void => {
  for (const name of Object.keys(patch)) {
    if (includesName(BOOTSTRAP_ENVIRONMENT_NAMES, name)) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }
  }
}

const prepare = async (
  input: EnvironmentInput,
  { baseEnvironment = process.env, locator, project }: BootstrapOptions
): Promise<NodeJS.ProcessEnv> => {
  const binFolder = npath.toPortablePath(input.binDirectory)

  if (locator) {
    await project.restoreInstallState()
  }

  assertEnvironmentPatch(input.patch)

  const baseEnv = merge([project.configuration.env, baseEnvironment])

  for (const name of BOOTSTRAP_ENVIRONMENT_NAMES) {
    remove(baseEnv, name)
  }

  applyPatch(baseEnv, input.patch)

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
