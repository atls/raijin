import type { ExecutorOptions }               from '../../src/execution/node/interfaces/executor.js'
import type { Input as YarnEnvironmentInput } from '../../src/execution/yarn/create.interfaces.js'

import { create as createNodeExecutor }       from '../../src/execution/node/executor.js'
import { create as createYarnEnvironment }    from '../../src/execution/yarn/create.js'
import { resolve as resolveLoader }           from '../../src/runtime/node/typescript.js'

type Options = Omit<YarnEnvironmentInput, 'binDirectory' | 'cwd' | 'patch'> & {
  streams?: ExecutorOptions['streams']
}

export const compose = ({ streams, ...options }: Options): ReturnType<typeof createNodeExecutor> =>
  createNodeExecutor({
    environment: {
      prepare: async (input) => createYarnEnvironment({ ...options, ...input }),
    },
    loader: {
      resolve: async () => resolveLoader(),
    },
    streams: streams ?? {
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
  })
