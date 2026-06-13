import type { Project }                   from '@yarnpkg/core'

import { npath }                          from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }        from '../managed-node-loader.js'
import { resolveCurrentYarnPath }         from '../current-yarn-executable.js'
import { applyManagedNodeLoader }         from '../managed-node-loader.js'
import { createManagedNodeWrapperSource } from '../managed-node-loader.js'

type MakePathWrapper = (name: string, argv0: string, args?: Array<string>) => Promise<void>

export const setupScriptEnvironment = async (
  project: Project,
  env: NodeJS.ProcessEnv,
  makePathWrapper: MakePathWrapper
): Promise<void> => {
  applyManagedNodeLoader(env)

  const yarnPath = resolveCurrentYarnPath(project)

  if (!yarnPath) {
    return
  }

  const yarnBin = npath.fromPortablePath(yarnPath)

  await Promise.all([
    ...(env[MANAGED_NODE_LOADER_ENV]
      ? [makePathWrapper('node', process.execPath, ['-e', createManagedNodeWrapperSource()])]
      : []),
    makePathWrapper('run', process.execPath, [yarnBin, 'run']),
    makePathWrapper('yarn', process.execPath, [yarnBin]),
    makePathWrapper('yarnpkg', process.execPath, [yarnBin]),
    makePathWrapper('node-gyp', process.execPath, [yarnBin, 'run', '--top-level', 'node-gyp']),
  ])
}
