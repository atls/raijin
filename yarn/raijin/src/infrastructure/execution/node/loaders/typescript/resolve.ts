import { access }        from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'

import { Resolution }    from './resolution.js'

const PACKAGE_NAME = '@atls/raijin/package.json'
const DIST_PATH = 'dist/runtime/typescript-loader.js'
const SOURCE_PATH = 'src/runtime/typescript-loader.ts'
const SPECIFIER = '@atls/raijin/typescript-loader'

const require = createRequire(import.meta.url)

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch {
    return false
  }
}

export const resolveSource = async (packagePath: string): Promise<string> => {
  const sourcePath = join(dirname(packagePath), SOURCE_PATH)

  if (!(await exists(sourcePath))) {
    throw Resolution.sourceUnavailable(PACKAGE_NAME)
  }

  return pathToFileURL(sourcePath).href
}

export const resolve = async (packagePath?: string): Promise<string> => {
  if (!packagePath) {
    return pathToFileURL(require.resolve(SPECIFIER)).href
  }

  const packageDirectory = dirname(packagePath)
  const distPath = join(packageDirectory, DIST_PATH)

  if (await exists(distPath)) {
    return pathToFileURL(distPath).href
  }

  const sourcePath = join(packageDirectory, SOURCE_PATH)

  if (await exists(sourcePath)) {
    return pathToFileURL(sourcePath).href
  }

  throw Resolution.unavailable(PACKAGE_NAME)
}
