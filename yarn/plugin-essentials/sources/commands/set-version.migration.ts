import type { Dirent }              from 'node:fs'

import { readdir }                  from 'node:fs/promises'
import { rm }                       from 'node:fs/promises'
import { dirname }                  from 'node:path'
import { join }                     from 'node:path'

import { getRaijinRuntimeYarnPath } from '@atls/raijin/runtime'

import { portableToNativePath }     from './set-version.utils.js'

const OBSOLETE_RAIJIN_RUNTIME_FILE_NAMES = new Set(['yarn-remote.mjs'])
const OBSOLETE_RAIJIN_RUNTIME_FILE_PATTERN = /^raijin-yarn-.+\.mjs$/

const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT'

const isObsoleteRaijinRuntimeFileName = (fileName: string): boolean =>
  OBSOLETE_RAIJIN_RUNTIME_FILE_NAMES.has(fileName) ||
  OBSOLETE_RAIJIN_RUNTIME_FILE_PATTERN.test(fileName)

const readDirectoryEntries = async (path: string): Promise<Array<Dirent>> => {
  try {
    return await readdir(path, { withFileTypes: true })
  } catch (error) {
    if (isNotFoundError(error)) {
      return []
    }

    throw error
  }
}

export const cleanupObsoleteRaijinRuntimeFiles = async (cwd: string): Promise<void> => {
  const yarnPath = getRaijinRuntimeYarnPath()
  const runtimePath = join(portableToNativePath(cwd), portableToNativePath(yarnPath))
  const runtimeDirectory = dirname(runtimePath)
  const entries = await readDirectoryEntries(runtimeDirectory)

  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .filter((entry) => isObsoleteRaijinRuntimeFileName(entry.name))
      .map(async (entry) => {
        await rm(join(runtimeDirectory, entry.name), { force: true })
      })
  )
}
