import { LOADER }               from '../../../infrastructure/execution/node/loaders/environment.js'
import { REGISTRATION }         from '../../../infrastructure/execution/node/loaders/environment.js'
import { REGISTERED_PNP_LOADER } from '../../../infrastructure/execution/node/loaders/environment.js'
import { create as createRegistrationImport } from '../../../infrastructure/execution/node/loaders/registration.js'
import { createCanonicalNames } from '../../../infrastructure/yarn/environment/variables.js'
import { get as getEnvironmentVariable } from '../../../infrastructure/yarn/environment/variables.js'
import { remove as removeEnvironmentVariable } from '../../../infrastructure/yarn/environment/variables.js'
import { set as setEnvironmentVariable } from '../../../infrastructure/yarn/environment/variables.js'

export const REGISTERED_PNP_LOADER_ENV = REGISTERED_PNP_LOADER

const MANAGED_ENVIRONMENT_NAMES = new Set([LOADER, REGISTRATION, REGISTERED_PNP_LOADER_ENV])
const MANAGED_WINDOWS_ENVIRONMENT_NAMES = new Set(
  Array.from(MANAGED_ENVIRONMENT_NAMES, (name) => name.toUpperCase())
)
const CANONICAL_ENVIRONMENT_NAMES = createCanonicalNames(Array.from(MANAGED_ENVIRONMENT_NAMES))

const NODE_LOADER_IMPORT_OPTION = '--import'
const NODE_LOADER_REGISTER_IMPORT_PREFIX =
  'data:text/javascript,import%20%7B%20register%20%7D%20from%20%22node%3Amodule%22%3B'

export const appendNodeOption = (
  nodeOptions: string | undefined,
  option: string,
  value: string
): string => [nodeOptions, option, value].filter(Boolean).join(' ')

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
): boolean =>
  platform === 'win32'
    ? MANAGED_WINDOWS_ENVIRONMENT_NAMES.has(name.toUpperCase())
    : MANAGED_ENVIRONMENT_NAMES.has(name)

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
  const registeredNodeLoader = getEnvironmentVariable(env, REGISTRATION, platform)
  let nodeOptions = getEnvironmentVariable(env, 'NODE_OPTIONS', platform)

  if (registeredNodeLoader) {
    const registration = createRegistrationImport([registeredNodeLoader])

    nodeOptions = removeNodeLoaderImports(nodeOptions, (value) => value === registration)
  }

  if (managedNodeLoader) {
    const registration = createRegistrationImport([managedNodeLoader])

    nodeOptions = removeNodeLoaderImports(nodeOptions, (value) => value === registration)
    nodeOptions = appendNodeOption(nodeOptions, NODE_LOADER_IMPORT_OPTION, registration)
    setEnvironmentVariable(env, LOADER, managedNodeLoader, platform, CANONICAL_ENVIRONMENT_NAMES)
    setEnvironmentVariable(
      env,
      REGISTRATION,
      managedNodeLoader,
      platform,
      CANONICAL_ENVIRONMENT_NAMES
    )
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
