import { access }        from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { resolve }       from 'node:path'
import { pathToFileURL } from 'node:url'

const PNP_ESM_LOADER_FILENAME = '.pnp.loader.mjs'
const CODE_RUNTIME_PACKAGE_JSON = '@atls/code-runtime/package.json'
const TYPESCRIPT_LOADER_DIST_PATH = 'dist/typescript-loader.js'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/code-runtime/typescript-loader'

const require = createRequire(import.meta.url)

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

const getPnpEsmLoaderPaths = (cwd: string): Array<string> => {
  let current = resolve(cwd)
  const paths: Array<string> = []

  while (current !== dirname(current)) {
    paths.push(join(current, PNP_ESM_LOADER_FILENAME))
    current = dirname(current)
  }

  return paths
}

export const findPnpEsmLoader = async (cwd: string): Promise<string | undefined> => {
  const pnpEsmLoaderPaths = await Promise.all(
    getPnpEsmLoaderPaths(cwd).map(async (path) => ((await fileExists(path)) ? path : undefined))
  )
  const pnpEsmLoaderPath = pnpEsmLoaderPaths.find(Boolean)

  return pnpEsmLoaderPath ? pathToFileURL(pnpEsmLoaderPath).href : undefined
}

export const resolveTypeScriptLoader = async (): Promise<string> => {
  try {
    const codeRuntimePackagePath = require.resolve(CODE_RUNTIME_PACKAGE_JSON)
    const typeScriptLoaderPath = join(dirname(codeRuntimePackagePath), TYPESCRIPT_LOADER_DIST_PATH)

    if (await fileExists(typeScriptLoaderPath)) {
      return pathToFileURL(typeScriptLoaderPath).href
    }
  } catch {
    return TYPESCRIPT_LOADER_SPECIFIER
  }

  return TYPESCRIPT_LOADER_SPECIFIER
}

export const createServiceExecArgv = (
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

export const createServiceRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const [pnpEsmLoader, typeScriptLoader] = await Promise.all([
    findPnpEsmLoader(cwd),
    resolveTypeScriptLoader(),
  ])

  return createServiceExecArgv(pnpEsmLoader, typeScriptLoader)
}
