import type { YarnNodeEnvironmentOptions } from './executor.interfaces.js'

import { scriptUtils }                     from '@yarnpkg/core'
import { npath }                           from '@yarnpkg/fslib'

import { createYarnBaseEnvironment }       from '../../../yarn/launcher.js'

const MANAGED_NODE_LOADER_ENV = 'RAIJIN_NODE_LOADER'
const OWNED_ENVIRONMENT_NAMES = new Set(
  [
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'PROJECT_CWD',
    'RAIJIN_NODE_LOADER',
    'RAIJIN_REGISTERED_PNP_LOADER',
    'YARN_IGNORE_PATH',
    'npm_config_user_agent',
    'npm_execpath',
  ].map((name) => name.toUpperCase())
)

const applyEnvironmentPatch = (
  environment: NodeJS.ProcessEnv,
  patch: YarnNodeEnvironmentOptions['environmentPatch']
): void => {
  for (const [name, value] of Object.entries(patch)) {
    if (OWNED_ENVIRONMENT_NAMES.has(name.toUpperCase())) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }

    if (value === undefined) {
      Reflect.deleteProperty(environment, name)
    } else {
      environment[name] = value
    }
  }
}

export const createYarnNodeEnvironment = async ({
  baseEnvironment,
  binFolder,
  cwd,
  environmentPatch,
  locator,
  project,
}: YarnNodeEnvironmentOptions): Promise<NodeJS.ProcessEnv> => {
  const baseEnv = createYarnBaseEnvironment({
    ...project.configuration.env,
    ...baseEnvironment,
  })
  const managedNodeLoaderName = Object.keys(baseEnv).find(
    (name) => name.toUpperCase() === MANAGED_NODE_LOADER_ENV
  )

  if (managedNodeLoaderName) {
    Reflect.deleteProperty(baseEnv, managedNodeLoaderName)
  }

  applyEnvironmentPatch(baseEnv, environmentPatch)

  const environment = await scriptUtils.makeScriptEnv({
    baseEnv,
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })

  environment.INIT_CWD = cwd
  environment.PROJECT_CWD = npath.fromPortablePath(project.cwd)

  return environment
}
