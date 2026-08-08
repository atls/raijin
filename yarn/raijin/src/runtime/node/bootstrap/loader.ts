import { createNodeLoaderRegistrationImport } from '../../../infrastructure/execution/node/loader-registration.js'

export const MANAGED_NODE_LOADER_ENV = 'RAIJIN_NODE_LOADER'
export const REGISTERED_PNP_LOADER_ENV = 'RAIJIN_REGISTERED_PNP_LOADER'
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

export const removeManagedNodeLoaderImports = (
  nodeOptions: string | undefined
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

      if (isManagedNodeLoaderImport(value)) {
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

export const registerNodeLoaders = async (loaders: Array<string>): Promise<void> => {
  await import(createNodeLoaderRegistrationImport(loaders))
}

export const applyManagedNodeLoader = (env: NodeJS.ProcessEnv): void => {
  const managedNodeLoader = env[MANAGED_NODE_LOADER_ENV]

  if (!managedNodeLoader) {
    return
  }

  const nodeOptions = removeManagedNodeLoaderImports(env.NODE_OPTIONS)

  env.NODE_OPTIONS = appendNodeOption(
    nodeOptions,
    NODE_LOADER_IMPORT_OPTION,
    createNodeLoaderRegistrationImport([managedNodeLoader])
  )
}
