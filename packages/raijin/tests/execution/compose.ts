import type { ExecutorOptions } from '../../src/infrastructure/adapters/node/execution/executor.interfaces.js'
import type { Input as YarnEnvironmentInput } from '../../src/infrastructure/providers/yarn/environment/create.interfaces.js'

import { create as createNodeExecutor } from '../../src/infrastructure/adapters/node/execution/executor.js'
import { resolve as resolveLoader } from '../../src/infrastructure/adapters/node/loaders/typescript/resolve.js'
import { create as createYarnEnvironment } from '../../src/infrastructure/providers/yarn/environment/create.js'

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
