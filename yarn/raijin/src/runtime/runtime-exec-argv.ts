import { access }        from 'node:fs/promises'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { resolve }       from 'node:path'
import { pathToFileURL } from 'node:url'

import { Resolution }    from '../infrastructure/execution/node/loaders/typescript/resolution.js'
import { resolve as resolveLoader } from '../infrastructure/execution/node/loaders/typescript/resolve.js'
import { resolveSource } from '../infrastructure/execution/node/loaders/typescript/resolve.js'

const preserveError = async (resolution: Promise<string>): Promise<string> => {
  try {
    return await resolution
  } catch (error) {
    if (error instanceof Resolution) {
      throw new Error(error.message)
    }

    throw error
  }
}

export const resolveSourceTypeScriptLoader = async (packagePath: string): Promise<string> =>
  preserveError(resolveSource(packagePath))

export const resolveTypeScriptLoader = async (packagePath?: string): Promise<string> =>
  preserveError(resolveLoader(packagePath))

const PNP_API_FILENAME = '.pnp.cjs'
const PNP_ESM_LOADER_FILENAME = '.pnp.loader.mjs'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'
const PNP_ESM_NODE_OPTION = /(?:^|[\\/])\.pnp\.loader\.mjs$/
const TYPESCRIPT_LOADER_NODE_OPTION =
  /(?:^@atls\/raijin\/typescript-loader$|[\\/]typescript-loader\.(?:js|mjs)$)/
const NODE_OPTIONS_WITH_VALUE = new Set(['--experimental-loader', '--loader'])

type NodeOptionToken = {
  raw: string
  value: string
}

type RuntimeEnvironmentOptions = {
  preservePnpEsmLoader?: boolean
}

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const getPnpRuntimePaths = (cwd: string, filename: string): Array<string> => {
  let current = resolve(cwd)
  const paths: Array<string> = []

  while (current !== dirname(current)) {
    paths.push(join(current, filename))
    current = dirname(current)
  }

  return paths
}

const isPnPEsmNodeOptionValue = (value: string): boolean => PNP_ESM_NODE_OPTION.test(value)

const isTypeScriptLoaderNodeOptionValue = (value: string): boolean =>
  TYPESCRIPT_LOADER_NODE_OPTION.test(value)

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

const removeRuntimeLoaderNodeOptions = (
  nodeOptions: string,
  { preservePnpEsmLoader = false }: RuntimeEnvironmentOptions = {}
): string => {
  const options = splitNodeOptions(nodeOptions)
  const filtered: Array<string> = []

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index]
    const [name, value] = option.value.split('=', 2)

    if (
      value &&
      NODE_OPTIONS_WITH_VALUE.has(name) &&
      (isTypeScriptLoaderNodeOptionValue(value) ||
        (!preservePnpEsmLoader && isPnPEsmNodeOptionValue(value)))
    ) {
      continue
    }

    if (NODE_OPTIONS_WITH_VALUE.has(option.value)) {
      const next = options.at(index + 1)

      if (
        next &&
        (isTypeScriptLoaderNodeOptionValue(next.value) ||
          (!preservePnpEsmLoader && isPnPEsmNodeOptionValue(next.value)))
      ) {
        index += 1
        continue
      }
    }

    filtered.push(option.raw)
  }

  return filtered.join(' ')
}

export const findPnpEsmLoader = async (cwd: string): Promise<string | undefined> => {
  const pnpEsmLoaderPaths = await Promise.all(
    getPnpRuntimePaths(cwd, PNP_ESM_LOADER_FILENAME).map(async (path) =>
      (await fileExists(path)) ? path : undefined)
  )
  const pnpEsmLoaderPath = pnpEsmLoaderPaths.find(Boolean)

  return pnpEsmLoaderPath ? pathToFileURL(pnpEsmLoaderPath).href : undefined
}

const findPnpApi = async (cwd: string): Promise<string | undefined> => {
  const pnpApiPaths = await Promise.all(
    getPnpRuntimePaths(cwd, PNP_API_FILENAME).map(async (path) =>
      (await fileExists(path)) ? path : undefined)
  )

  return pnpApiPaths.find(Boolean)
}

export const createTypeScriptRuntimeExecArgv = (
  pnpEsmLoader?: string,
  typeScriptLoader = TYPESCRIPT_LOADER_SPECIFIER
): Array<string> => {
  const execArgv: Array<string> = []

  if (pnpEsmLoader) {
    execArgv.push('--loader', pnpEsmLoader)
  }

  execArgv.push('--loader', typeScriptLoader)
  execArgv.push('--enable-source-maps')

  return execArgv
}

export const createRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const [pnpApi, pnpEsmLoader, typeScriptLoader] = await Promise.all([
    findPnpApi(cwd),
    findPnpEsmLoader(cwd),
    resolveTypeScriptLoader(),
  ])
  const execArgv = createTypeScriptRuntimeExecArgv(pnpEsmLoader, typeScriptLoader)

  return pnpApi ? ['--require', pnpApi, ...execArgv] : execArgv
}

export const createRuntimeEnvironment = (
  environment: NodeJS.ProcessEnv = process.env,
  options: RuntimeEnvironmentOptions = {}
): NodeJS.ProcessEnv => {
  const runtimeEnvironment = { ...environment }
  const nodeOptions = runtimeEnvironment.NODE_OPTIONS

  if (!nodeOptions) {
    return runtimeEnvironment
  }

  const sanitizedNodeOptions = removeRuntimeLoaderNodeOptions(nodeOptions, options)

  if (sanitizedNodeOptions) {
    runtimeEnvironment.NODE_OPTIONS = sanitizedNodeOptions
  } else {
    delete runtimeEnvironment.NODE_OPTIONS
  }

  return runtimeEnvironment
}
