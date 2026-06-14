export const MANAGED_NODE_LOADER_ENV = 'RAIJIN_NODE_LOADER'
const NODE_LOADER_IMPORT_OPTION = '--import'
const NODE_LOADER_REGISTER_IMPORT_PREFIX =
  'data:text/javascript,import%20%7B%20register%20%7D%20from%20%22node%3Amodule%22%3B'

const NODE_LOADER_OPTIONS = new Set(['--experimental-loader', '--loader'])
const createNodeLoaderRegisterImport = (loader: string): string =>
  `data:text/javascript,${encodeURIComponent(
    [
      'import { register } from "node:module";',
      'import { pathToFileURL } from "node:url";',
      `register(${JSON.stringify(loader)}, pathToFileURL("./"));`,
    ].join(' ')
  )}`

export const appendNodeOption = (
  nodeOptions: string | undefined,
  option: string,
  value: string
): string => [nodeOptions, option, value].filter(Boolean).join(' ')

const isManagedNodeLoaderImport = (value: string | undefined): boolean =>
  value?.startsWith(NODE_LOADER_REGISTER_IMPORT_PREFIX) ?? false

const isPnpNodeLoader = (value: string | undefined): boolean =>
  value?.includes('.pnp.loader.mjs') ?? false

export const removeNodeLoaderOptions = (nodeOptions: string | undefined): string | undefined => {
  if (!nodeOptions) {
    return undefined
  }

  const tokens = nodeOptions.split(/\s+/).filter(Boolean)
  const nextTokens: Array<string> = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const [option] = token.split('=', 2)

    if (NODE_LOADER_OPTIONS.has(option)) {
      const value = token.includes('=') ? token.split('=', 2)[1] : tokens[index + 1]

      if (isPnpNodeLoader(value)) {
        if (!token.includes('=')) {
          index += 1
        }

        continue
      }

      nextTokens.push(token)

      if (!token.includes('=') && value) {
        nextTokens.push(value)
        index += 1
      }

      continue
    }

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

export const applyManagedNodeLoader = (env: NodeJS.ProcessEnv): void => {
  const managedNodeLoader = env[MANAGED_NODE_LOADER_ENV]

  if (!managedNodeLoader) {
    return
  }

  const nodeOptions = removeNodeLoaderOptions(env.NODE_OPTIONS)

  env.NODE_OPTIONS = appendNodeOption(
    nodeOptions,
    NODE_LOADER_IMPORT_OPTION,
    createNodeLoaderRegisterImport(managedNodeLoader)
  )
}
