import type { IconSourceReader } from '../../../../application/generation/icons/index.js'

import { readFile }              from 'node:fs/promises'
import { readdir }               from 'node:fs/promises'
import { basename }              from 'node:path'
import { extname }               from 'node:path'
import { join }                  from 'node:path'

const compareNames = (left: string, right: string): number => {
  if (left === right) {
    return 0
  }

  return left < right ? -1 : 1
}

export const create = (): IconSourceReader => ({
  async read(cwd) {
    const directory = join(cwd, 'icons')
    const entries = await readdir(directory, { withFileTypes: true })
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map((entry) => entry.name)
      .sort(compareNames)

    return Promise.all(
      files.map(async (file) => ({
        content: await readFile(join(directory, file), 'utf8'),
        name: basename(file, extname(file)),
      }))
    )
  },
})
