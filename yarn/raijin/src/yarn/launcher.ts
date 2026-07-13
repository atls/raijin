import { delimiter } from 'node:path'

const PATH_ENVIRONMENT_NAME = /^path$/i
const TEMPORARY_YARN_BIN_PATH = /[\\/]xfs-[^\\/]*(?:[\\/]|$)/
const PNP_NODE_OPTION = /(?:^|[\\/])\.pnp\.(?:cjs|loader\.mjs)$/
const NODE_OPTIONS_WITH_VALUE = new Set(['--experimental-loader', '--loader', '--require', '-r'])

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

const sanitizePathEnvironment = (value: string): string =>
  value
    .split(delimiter)
    .filter((item) => item && !TEMPORARY_YARN_BIN_PATH.test(item))
    .join(delimiter)

const setPathEnvironment = (environment: NodeJS.ProcessEnv): void => {
  const pathName = Object.keys(environment).find((name) => PATH_ENVIRONMENT_NAME.test(name))
  const pathValue = pathName ? environment[pathName] : undefined

  if (!pathName || !pathValue) {
    return
  }

  const sanitizedPathValue = sanitizePathEnvironment(pathValue)

  if (sanitizedPathValue) {
    environment[pathName] = sanitizedPathValue
  } else {
    Reflect.deleteProperty(environment, pathName)
  }
}

export const createLauncherBaseEnvironment = (
  environment: NodeJS.ProcessEnv = process.env
): NodeJS.ProcessEnv => {
  const yarnEnvironment = { ...environment }
  const nodeOptions = yarnEnvironment.NODE_OPTIONS

  delete yarnEnvironment.BERRY_BIN_FOLDER
  delete yarnEnvironment.npm_config_user_agent
  delete yarnEnvironment.npm_execpath
  delete yarnEnvironment.YARN_IGNORE_PATH

  if (nodeOptions) {
    const sanitizedNodeOptions = removePnPNodeOptions(nodeOptions)

    if (sanitizedNodeOptions) {
      yarnEnvironment.NODE_OPTIONS = sanitizedNodeOptions
    } else {
      delete yarnEnvironment.NODE_OPTIONS
    }
  }

  setPathEnvironment(yarnEnvironment)

  return yarnEnvironment
}
