import type { SourceReader } from '../../../../application/icons/generation/index.js'

import { readFile }          from 'node:fs/promises'
import { readdir }           from 'node:fs/promises'
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
    const files = (await readdir(directory))
      .filter((file) => file.endsWith('.svg'))
      .sort(compareNames)

    return Promise.all(
      files.map(async (file) => ({
        content: await readFile(join(directory, file), 'utf8'),
        name: basename(file, extname(file)),
      }))
    )
  },
})
