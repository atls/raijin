import { mkdtemp } from 'node:fs/promises'
import { rm }      from 'node:fs/promises'
import { tmpdir }  from 'node:os'
import { join }    from 'node:path'

const PREFIX = 'raijin-node-execution-'

export const directory = {
  create: async () => {
    const path = await mkdtemp(join(tmpdir(), PREFIX))

    return {
      path,
      remove: async () => rm(path, { force: true, recursive: true }),
    }
  },
}
