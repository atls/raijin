import { access }        from 'node:fs/promises'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { resolve }       from 'node:path'
import { pathToFileURL } from 'node:url'

const PNP_ESM_LOADER_FILENAME = '.pnp.loader.mjs'
const TYPESCRIPT_LOADER = '@atls/code-runtime/typescript-loader'

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

export const createServiceExecArgv = (pnpEsmLoader?: string): Array<string> => {
  const execArgv: Array<string> = []

  if (pnpEsmLoader) {
    execArgv.push('--loader', pnpEsmLoader)
  }

  execArgv.push('--loader', TYPESCRIPT_LOADER)
  execArgv.push('--enable-source-maps')

  return execArgv
}

export const createServiceRuntimeExecArgv = async (cwd: string): Promise<Array<string>> =>
  createServiceExecArgv(await findPnpEsmLoader(cwd))
