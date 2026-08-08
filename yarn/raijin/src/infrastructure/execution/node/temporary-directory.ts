import type { TemporaryDirectoryProvider } from './executor.interfaces.js'

import { mkdtemp }                         from 'node:fs/promises'
import { rm }                              from 'node:fs/promises'
import { tmpdir }                          from 'node:os'
import { join }                            from 'node:path'

const TEMPORARY_DIRECTORY_PREFIX = 'raijin-node-execution-'

export const nodeTemporaryDirectories: TemporaryDirectoryProvider = {
  create: async () => {
    const path = await mkdtemp(join(tmpdir(), TEMPORARY_DIRECTORY_PREFIX))

    return {
      path,
      remove: async () => rm(path, { force: true, recursive: true }),
    }
  },
}
