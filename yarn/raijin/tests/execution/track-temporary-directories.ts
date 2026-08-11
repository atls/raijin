import type { TestContext } from 'node:test'

import { mkdtemp }          from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'

import { directory }        from '../../src/infrastructure/adapters/node/execution/directory.js'

export const trackTemporaryDirectories = (
  context: TestContext,
  cleanupFailure?: Error
): Array<string> => {
  const removed: Array<string> = []

  context.mock.method(directory, 'create', async () => {
    const path = await mkdtemp(join(tmpdir(), 'raijin-node-executor-test-'))

    return {
      path,
      remove: async () => {
        removed.push(path)

        if (cleanupFailure) {
          throw cleanupFailure
        }

        await rm(path, { force: true, recursive: true })
      },
    }
  })

  return removed
}
