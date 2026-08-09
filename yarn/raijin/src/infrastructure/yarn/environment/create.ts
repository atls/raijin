import { delimiter } from 'node:path'
import { win32 }     from 'node:path'

import { discard }   from './variables.js'
import { merge }     from './variables.js'

const PATH_NAME = /^path$/i
const TEMPORARY_BIN_PATH = /[\\/]xfs-[^\\/]*(?:[\\/]|$)/

const sanitizePath = (value: string, platform: NodeJS.Platform): string =>
  value
    .split(platform === 'win32' ? win32.delimiter : delimiter)
    .filter((item) => item && !TEMPORARY_BIN_PATH.test(item))
    .join(platform === 'win32' ? win32.delimiter : delimiter)

const sanitizePathVariable = (environment: NodeJS.ProcessEnv, platform: NodeJS.Platform): void => {
  const name = Object.keys(environment).find((candidate) => PATH_NAME.test(candidate))
  const value = name ? environment[name] : undefined

  if (!name || !value) {
    return
  }

  const sanitized = sanitizePath(value, platform)

  if (sanitized) {
    environment[name] = sanitized
  } else {
    Reflect.deleteProperty(environment, name)
  }
}

export const create = (
  environment: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv => {
  const result = merge([environment], platform)

  discard(result, platform)

  sanitizePathVariable(result, platform)

  return result
}
