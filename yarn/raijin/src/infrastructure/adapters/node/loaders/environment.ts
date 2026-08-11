import { createNames as createCanonicalNames } from '../../../process/environment/map.js'
import { get as getEnvironmentVariable }       from '../../../process/environment/map.js'
import { includesName }                        from '../../../process/environment/map.js'
import { remove as removeEnvironmentVariable } from '../../../process/environment/map.js'
import { set as setEnvironmentVariable }       from '../../../process/environment/map.js'
import { create as createRegistrationImport }  from './registration.js'

export const LOADER = 'RAIJIN_NODE_LOADER'
export const REGISTRATION = 'RAIJIN_NODE_LOADER_REGISTRATION'
export const REGISTERED_PNP_LOADER = 'RAIJIN_REGISTERED_PNP_LOADER'

const MANAGED_ENVIRONMENT_NAMES = [LOADER, REGISTRATION, REGISTERED_PNP_LOADER]
const CANONICAL_ENVIRONMENT_NAMES = createCanonicalNames(MANAGED_ENVIRONMENT_NAMES)

const NODE_LOADER_IMPORT_OPTION = '--import'
const NODE_LOADER_REGISTER_IMPORT_PREFIX =
  'data:text/javascript,import%20%7B%20register%20%7D%20from%20%22node%3Amodule%22%3B'

export const appendNodeOption = (
  nodeOptions: string | undefined,
  option: string,
  value: string
): string => [nodeOptions, option, value].filter(Boolean).join(' ')

const createNodeLoaderOption = (loader: string): string =>
  `${NODE_LOADER_IMPORT_OPTION} ${createRegistrationImport([loader])}`

const removeOwnedNodeLoaderOption = (
  nodeOptions: string | undefined,
  option: string
): string | undefined => {
  if (nodeOptions === undefined) {
    return undefined
  }

  let start = nodeOptions.lastIndexOf(option)

  while (start >= 0) {
    const end = start + option.length
    const startsAtBoundary = start === 0 || nodeOptions[start - 1] === ' '
    const endsAtBoundary = end === nodeOptions.length || nodeOptions[end] === ' '

    if (startsAtBoundary && endsAtBoundary) {
      if (start > 0) {
        return nodeOptions.slice(0, start - 1) + nodeOptions.slice(end)
      }

      return nodeOptions[end] === ' ' ? nodeOptions.slice(end + 1) : nodeOptions.slice(end)
    }

    start = nodeOptions.lastIndexOf(option, start - 1)
  }

  return nodeOptions
}

const isManagedNodeLoaderImport = (value: string | undefined): boolean =>
  value?.startsWith(NODE_LOADER_REGISTER_IMPORT_PREFIX) ?? false

const removeNodeLoaderImports = (
  nodeOptions: string | undefined,
  predicate: (value: string | undefined) => boolean
): string | undefined => {
  if (!nodeOptions) {
    return undefined
  }

  const tokens = nodeOptions.split(/\s+/).filter(Boolean)
  const nextTokens: Array<string> = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const [option] = token.split('=', 2)

    if (option === NODE_LOADER_IMPORT_OPTION) {
      const value = token.includes('=') ? token.split('=', 2)[1] : tokens[index + 1]

      if (predicate(value)) {
        if (!token.includes('=')) {
          index += 1
        }

        continue
      }
    }

    nextTokens.push(token)
  }

  return nextTokens.length > 0 ? nextTokens.join(' ') : undefined
}

export const isManagedNodeEnvironmentName = (
  name: string,
  platform: NodeJS.Platform = process.platform
): boolean => includesName(MANAGED_ENVIRONMENT_NAMES, name, platform)

export const removeEnvironmentMarkers = (
  environment: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): void => {
  for (const name of MANAGED_ENVIRONMENT_NAMES) {
    removeEnvironmentVariable(environment, name, platform)
  }
}

export const removeManagedNodeLoaderImports = (
  nodeOptions: string | undefined
): string | undefined => removeNodeLoaderImports(nodeOptions, isManagedNodeLoaderImport)

export const registerNodeLoaders = async (loaders: Array<string>): Promise<void> => {
  await import(createRegistrationImport(loaders))
}

export const applyManagedNodeLoader = (
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform = process.platform
): void => {
  const managedNodeLoader = getEnvironmentVariable(env, LOADER, platform)
  const registeredNodeLoaderOption = getEnvironmentVariable(env, REGISTRATION, platform)
  let nodeOptions = getEnvironmentVariable(env, 'NODE_OPTIONS', platform)

  if (registeredNodeLoaderOption) {
    nodeOptions = removeOwnedNodeLoaderOption(nodeOptions, registeredNodeLoaderOption)
  }

  if (managedNodeLoader) {
    const option = createNodeLoaderOption(managedNodeLoader)

    nodeOptions = appendNodeOption(
      nodeOptions,
      NODE_LOADER_IMPORT_OPTION,
      createRegistrationImport([managedNodeLoader])
    )
    setEnvironmentVariable(env, LOADER, managedNodeLoader, platform, CANONICAL_ENVIRONMENT_NAMES)
    setEnvironmentVariable(env, REGISTRATION, option, platform, CANONICAL_ENVIRONMENT_NAMES)
  } else {
    removeEnvironmentVariable(env, LOADER, platform)
    removeEnvironmentVariable(env, REGISTRATION, platform)
  }

  if (nodeOptions) {
    setEnvironmentVariable(env, 'NODE_OPTIONS', nodeOptions, platform, CANONICAL_ENVIRONMENT_NAMES)
  } else {
    removeEnvironmentVariable(env, 'NODE_OPTIONS', platform)
  }
}
