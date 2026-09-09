import type { Input as YarnEnvironmentInput } from '../../src/infrastructure/providers/yarn/environment/create.interfaces.js'

import { create as createNodeExecutor } from '../../src/infrastructure/adapters/node/execution/executor.js'
import { resolve as resolveLoader } from '../../src/infrastructure/adapters/node/loaders/typescript/resolve.js'
import { create as createYarnEnvironment } from '../../src/infrastructure/providers/yarn/environment/create.js'

type Options = Omit<YarnEnvironmentInput, 'binDirectory' | 'cwd' | 'patch'>

export const compose = (options: Options): ReturnType<typeof createNodeExecutor> =>
  createNodeExecutor({
    environment: {
      prepare: async (input) => createYarnEnvironment({ ...options, ...input }),
    },
    loader: {
      resolve: async () => resolveLoader(),
    },
  })
