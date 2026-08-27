import type { Locator } from '@yarnpkg/core'
import type { Project } from '@yarnpkg/core'

import { create as createNodeExecutor } from '../../../infrastructure/adapters/node/execution/executor.js'
import { create as createYarnEnvironment } from '../../../infrastructure/providers/yarn/environment/create.js'

interface ManagedNodeOptions {
  baseEnvironment: NodeJS.ProcessEnv
  locator: Locator
  project: Project
}

export const createManagedNodeExecutor = ({
  baseEnvironment,
  locator,
  project,
}: ManagedNodeOptions): ReturnType<typeof createNodeExecutor> =>
  createNodeExecutor({
    environment: {
      prepare: async (input) =>
        createYarnEnvironment({
          ...input,
          baseEnvironment,
          locator,
          project,
        }),
    },
  })
