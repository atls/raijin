import type { SourceReader } from '../../../../application/icons/generation/index.js'

import { lstat }             from 'node:fs/promises'
import { readFile }          from 'node:fs/promises'
import { readdir }           from 'node:fs/promises'
import { stat }              from 'node:fs/promises'
import { basename }          from 'node:path'
import { extname }           from 'node:path'
import { join }              from 'node:path'

const compareNames = (left: string, right: string): number => {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

export const create = (): SourceReader => ({
  async read(cwd) {
    const directory = join(cwd, 'icons')
    const directoryEntry = await lstat(directory)

    if (!directoryEntry.isDirectory()) {
      throw new TypeError('Icon source boundary must be a directory: icons')
    }

    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.svg'))
      .sort(compareNames)

    return Promise.all(
      files.map(async (file) => {
        const path = join(directory, file)
        const entry = await lstat(path)
        const isRegularFile =
          entry.isFile() || (entry.isSymbolicLink() && (await stat(path)).isFile())

        if (!isRegularFile) {
          throw new TypeError(`Icon source path must be a regular file: ${file}`)
        }

        return {
          content: await readFile(path, 'utf8'),
          name: basename(file, extname(file)),
        }
      })
    )
  },
})
