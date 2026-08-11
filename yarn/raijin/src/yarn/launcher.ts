import { delimiter }                           from 'node:path'
import { win32 }                               from 'node:path'

import { createNames }                         from '../infrastructure/process/environment/map.js'
import { get as getEnvironmentVariable }       from '../infrastructure/process/environment/map.js'
import { includesName }                        from '../infrastructure/process/environment/map.js'
import { merge as mergeEnvironments }          from '../infrastructure/process/environment/map.js'
import { remove as removeEnvironmentVariable } from '../infrastructure/process/environment/map.js'
import { set as setEnvironmentVariable }       from '../infrastructure/process/environment/map.js'
import { isManagedNodeEnvironmentName } from '../infrastructure/providers/node/loader/environment.js'
import { removeAppliedLoaderRegistration } from '../infrastructure/providers/node/loader/environment.js'

const TRANSIENT_ENVIRONMENT_NAMES = [
  'BERRY_BIN_FOLDER',
  'npm_config_user_agent',
  'npm_execpath',
  'npm_node_execpath',
  'YARN_IGNORE_PATH',
]
const MANAGED_ENVIRONMENT_NAMES = ['NODE_OPTIONS', 'PATH', ...TRANSIENT_ENVIRONMENT_NAMES]
const CANONICAL_ENVIRONMENT_NAMES = createNames(MANAGED_ENVIRONMENT_NAMES)

const removeBinFolder = (
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): void => {
  const binFolder = getEnvironmentVariable(environment, 'BERRY_BIN_FOLDER', platform)
  const path = getEnvironmentVariable(environment, 'PATH', platform)

  if (!binFolder || !path) {
    return
  }

  const separator = platform === 'win32' ? win32.delimiter : delimiter
  const nextPath = path
    .split(separator)
    .filter(
      (item) =>
        item &&
        (platform === 'win32' ? item.toUpperCase() !== binFolder.toUpperCase() : item !== binFolder)
    )
    .join(separator)

  if (nextPath) {
    setEnvironmentVariable(environment, 'PATH', nextPath, platform, CANONICAL_ENVIRONMENT_NAMES)
  } else {
    removeEnvironmentVariable(environment, 'PATH', platform)
  }
}

export const isLauncherEnvironmentName = (
  name: string,
  platform: NodeJS.Platform = process.platform
): boolean =>
  includesName(MANAGED_ENVIRONMENT_NAMES, name, platform) ||
  isManagedNodeEnvironmentName(name, platform)

export const createLauncherBaseEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const launcherEnvironment = mergeEnvironments(
    [environment],
    process.platform,
    CANONICAL_ENVIRONMENT_NAMES
  )

  removeBinFolder(launcherEnvironment)

  for (const name of TRANSIENT_ENVIRONMENT_NAMES) {
    removeEnvironmentVariable(launcherEnvironment, name)
  }

  removeAppliedLoaderRegistration(launcherEnvironment)

  return launcherEnvironment
}
