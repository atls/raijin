import { delimiter }   from 'node:path'
import { win32 }       from 'node:path'

import { createNames } from '../../../process/environment/map.js'
import { get }         from '../../../process/environment/map.js'
import { merge }       from '../../../process/environment/map.js'
import { remove }      from '../../../process/environment/map.js'
import { set }         from '../../../process/environment/map.js'

const OWNED_NAMES = [
  'BERRY_BIN_FOLDER',
  'npm_config_user_agent',
  'npm_execpath',
  'npm_node_execpath',
  'YARN_IGNORE_PATH',
]
const OWNED_NAME_SET = new Set(OWNED_NAMES)
const OWNED_WINDOWS_NAME_SET = new Set(OWNED_NAMES.map((name) => name.toUpperCase()))
const CANONICAL_NAMES = createNames(OWNED_NAMES)

export const isOwned = (name: string, platform: NodeJS.Platform = process.platform): boolean =>
  platform === 'win32' ? OWNED_WINDOWS_NAME_SET.has(name.toUpperCase()) : OWNED_NAME_SET.has(name)

const isSamePath = (left: string, right: string, platform: NodeJS.Platform): boolean =>
  platform === 'win32' ? left.toUpperCase() === right.toUpperCase() : left === right

const removeBinFolder = (
  environment: NodeJS.ProcessEnv,
  binFolder: string | undefined,
  platform: NodeJS.Platform
): void => {
  const path = get(environment, 'PATH', platform)

  if (!path || !binFolder) {
    return
  }

  const separator = platform === 'win32' ? win32.delimiter : delimiter
  const sanitized = path
    .split(separator)
    .filter((item) => item && !isSamePath(item, binFolder, platform))
    .join(separator)

  if (sanitized) {
    set(environment, 'PATH', sanitized, platform, CANONICAL_NAMES)
  } else {
    remove(environment, 'PATH', platform)
  }
}

export const sanitize = (
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv => {
  const result = merge([environment], platform, CANONICAL_NAMES)
  const binFolder = get(result, 'BERRY_BIN_FOLDER', platform)

  for (const name of OWNED_NAMES) {
    remove(result, name, platform)
  }

  removeBinFolder(result, binFolder, platform)

  return result
}
