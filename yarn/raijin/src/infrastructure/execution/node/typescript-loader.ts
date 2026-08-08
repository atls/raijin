import { access }        from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'

const RAIJIN_PACKAGE_JSON = '@atls/raijin/package.json'
const TYPESCRIPT_LOADER_DIST_PATH = 'dist/runtime/typescript-loader.js'
const TYPESCRIPT_LOADER_SOURCE_PATH = 'src/runtime/typescript-loader.ts'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

const require = createRequire(import.meta.url)

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

export const resolveSourceTypeScriptLoader = async (raijinPackagePath: string): Promise<string> => {
  const typeScriptLoaderSourcePath = join(dirname(raijinPackagePath), TYPESCRIPT_LOADER_SOURCE_PATH)

  if (!(await fileExists(typeScriptLoaderSourcePath))) {
    throw new Error(`Unable to resolve source TypeScript loader for ${RAIJIN_PACKAGE_JSON}`)
  }

  return pathToFileURL(typeScriptLoaderSourcePath).href
}

export const resolveTypeScriptLoader = async (raijinPackagePath?: string): Promise<string> => {
  if (!raijinPackagePath) {
    return pathToFileURL(require.resolve(TYPESCRIPT_LOADER_SPECIFIER)).href
  }

  const raijinPath = dirname(raijinPackagePath)
  const typeScriptLoaderPath = join(raijinPath, TYPESCRIPT_LOADER_DIST_PATH)

  if (await fileExists(typeScriptLoaderPath)) {
    return pathToFileURL(typeScriptLoaderPath).href
  }

  const typeScriptLoaderSourcePath = join(raijinPath, TYPESCRIPT_LOADER_SOURCE_PATH)

  if (await fileExists(typeScriptLoaderSourcePath)) {
    return pathToFileURL(typeScriptLoaderSourcePath).href
  }

  throw new Error(`Unable to resolve loadable TypeScript loader for ${RAIJIN_PACKAGE_JSON}`)
}
