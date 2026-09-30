import type { Config } from './config.js'

import { readFile }    from 'node:fs/promises'
import { join }        from 'node:path'
import { relative }    from 'node:path'

import ignorer         from 'ignore'

export const createFileFilter = async (cwd: string): Promise<(file: string) => boolean> => {
  const content = await readFile(join(cwd, 'package.json'), 'utf8')
  const { testIgnorePatterns = [] } = JSON.parse(content) as Config
  const ignore = ignorer.default().add(testIgnorePatterns)

  return (file) => ignore.filter([relative(cwd, file)]).length !== 0
}
