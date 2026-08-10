import { REGISTERED_PNP_LOADER_ENV }           from '../runtime/node/bootstrap/loader.js'
import { isOwned as isYarnEnvironmentName } from '../infrastructure/adapters/yarn/environment/sanitize.js'
import { sanitize as sanitizeEnvironment } from '../infrastructure/adapters/yarn/environment/sanitize.js'
import { get as getEnvironmentVariable }       from '../infrastructure/process/environment/map.js'
import { remove as removeEnvironmentVariable } from '../infrastructure/process/environment/map.js'
import { set as setEnvironmentVariable }       from '../infrastructure/process/environment/map.js'
import { isManagedNodeEnvironmentName }        from '../runtime/node/bootstrap/loader.js'

const PNP_NODE_OPTION = /(?:^|[\\/])\.pnp\.(?:cjs|loader\.mjs)$/
const NODE_OPTIONS_WITH_VALUE = new Set(['--experimental-loader', '--loader', '--require', '-r'])
const SANITIZED_ENVIRONMENT_NAMES = new Set(['NODE_OPTIONS', 'PATH'])
const SANITIZED_WINDOWS_ENVIRONMENT_NAMES = new Set(
  Array.from(SANITIZED_ENVIRONMENT_NAMES, (name) => name.toUpperCase())
)

type NodeOptionToken = {
  raw: string
  value: string
}

const splitNodeOptions = (nodeOptions: string): Array<NodeOptionToken> => {
  const tokens: Array<NodeOptionToken> = []
  let raw = ''
  let value = ''
  let quote: string | undefined

  for (let index = 0; index < nodeOptions.length; index += 1) {
    const char = nodeOptions[index]

    if (quote) {
      raw += char

      if (char === '\\' && nodeOptions[index + 1] === quote) {
        index += 1
        raw += nodeOptions[index]
        value += nodeOptions[index]
        continue
      }

      if (char === quote) {
        quote = undefined
        continue
      }

      value += char
      continue
    }

    if (char === '"' || char === "'") {
      raw += char
      quote = char
      continue
    }

    if (/\s/.test(char)) {
      if (raw) {
        tokens.push({ raw, value })
        raw = ''
        value = ''
      }

      continue
    }

    raw += char
    value += char
  }

  if (raw) {
    tokens.push({ raw, value })
  }

  return tokens
}

const removePnPNodeOptions = (nodeOptions: string): string => {
  const options = splitNodeOptions(nodeOptions)
  const filtered: Array<string> = []

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    const [name, value] = option.value.split('=', 2)

    if (value && NODE_OPTIONS_WITH_VALUE.has(name) && PNP_NODE_OPTION.test(value)) {
      continue
    }

    if (NODE_OPTIONS_WITH_VALUE.has(option.value)) {
      const next = options.at(index + 1)

      if (next && PNP_NODE_OPTION.test(next.value)) {
        index += 1
        continue
      }
    }

    filtered.push(option.raw)
  }

  return filtered.join(' ')
}

export const isLauncherEnvironmentName = (
  name: string,
  platform: NodeJS.Platform = process.platform
): boolean => {
  const sanitized =
    platform === 'win32'
      ? SANITIZED_WINDOWS_ENVIRONMENT_NAMES.has(name.toUpperCase())
      : SANITIZED_ENVIRONMENT_NAMES.has(name)

  return (
    sanitized ||
    isYarnEnvironmentName(name, platform) ||
    isManagedNodeEnvironmentName(name, platform)
  )
}

export const createLauncherBaseEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = sanitizeEnvironment(environment)
  const nodeOptions = getEnvironmentVariable(yarnEnvironment, 'NODE_OPTIONS')

  removeEnvironmentVariable(yarnEnvironment, REGISTERED_PNP_LOADER_ENV)

  if (nodeOptions) {
    const sanitizedNodeOptions = removePnPNodeOptions(nodeOptions)

    if (sanitizedNodeOptions) {
      setEnvironmentVariable(yarnEnvironment, 'NODE_OPTIONS', sanitizedNodeOptions)
    } else {
      removeEnvironmentVariable(yarnEnvironment, 'NODE_OPTIONS')
    }
  }

  return yarnEnvironment
}
