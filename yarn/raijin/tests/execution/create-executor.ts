import { createNodeExecutor }    from '../../src/infrastructure/adapters/node/execution/index.js'
import { createYarnEnvironment } from '../../src/infrastructure/adapters/yarn/environment/index.js'

export const createExecutor = (
  options: Parameters<typeof createYarnEnvironment>[0]
): ReturnType<typeof createNodeExecutor> =>
  createNodeExecutor({ environment: createYarnEnvironment(options) })
