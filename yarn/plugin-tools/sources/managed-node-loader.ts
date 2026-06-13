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
      if (!token.includes('=')) {
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

export const createManagedNodeWrapperSource = (): string =>
  `
const { spawnSync } = require('node:child_process');
const loaderOption = ${JSON.stringify(NODE_LOADER_IMPORT_OPTION)};
const loaderImportPrefix = ${JSON.stringify(NODE_LOADER_REGISTER_IMPORT_PREFIX)};
const loaderEnv = ${JSON.stringify(MANAGED_NODE_LOADER_ENV)};
const loaderOptions = new Set(${JSON.stringify([...NODE_LOADER_OPTIONS])});
const isManagedNodeLoaderImport = (value) =>
  typeof value === 'string' && value.startsWith(loaderImportPrefix);
const createNodeLoaderRegisterImport = (loader) =>
  'data:text/javascript,' + encodeURIComponent([
    'import { register } from "node:module";',
    'import { pathToFileURL } from "node:url";',
    'register(' + JSON.stringify(loader) + ', pathToFileURL("./"));',
  ].join(' '));
const removeNodeLoaders = (nodeOptions) => {
  if (!nodeOptions) return undefined;
  const tokens = nodeOptions.split(/\\s+/).filter(Boolean);
  const nextTokens = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const [option] = token.split('=', 2);
    if (loaderOptions.has(option)) {
      if (!token.includes('=')) index += 1;
      continue;
    }
    if (option === loaderOption) {
      const value = token.includes('=') ? token.split('=', 2)[1] : tokens[index + 1];
      if (isManagedNodeLoaderImport(value)) {
        if (!token.includes('=')) index += 1;
        continue;
      }
    }
    nextTokens.push(token);
  }
  return nextTokens.length > 0 ? nextTokens.join(' ') : undefined;
};
if (process.env[loaderEnv]) {
  process.env.NODE_OPTIONS = [removeNodeLoaders(process.env.NODE_OPTIONS), loaderOption, createNodeLoaderRegisterImport(process.env[loaderEnv])].filter(Boolean).join(' ');
}
const result = spawnSync(process.execPath, process.argv.slice(1), {
  stdio: 'inherit',
  env: process.env,
});
if (result.error) throw result.error;
if (result.signal) process.kill(process.pid, result.signal);
process.exit(result.status ?? 0);
`.trim()
