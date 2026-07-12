import type { Project }            from '@yarnpkg/core'

import { MANAGED_NODE_LOADER_ENV } from '@atls/raijin/runtime/node/bootstrap'
import { applyManagedNodeLoader }  from '@atls/raijin/runtime/node/bootstrap'

type MakePathWrapper = (name: string, argv0: string, args?: Array<string>) => Promise<void>

const COREPACK_EXECUTABLE = process.platform === 'win32' ? 'corepack.cmd' : 'corepack'

export const setupScriptEnvironment = async (
  _project: Project,
  env: NodeJS.ProcessEnv,
  makePathWrapper: MakePathWrapper
): Promise<void> => {
  applyManagedNodeLoader(env)

  await Promise.all([
    ...(env[MANAGED_NODE_LOADER_ENV] ? [makePathWrapper('node', process.execPath)] : []),
    makePathWrapper('run', COREPACK_EXECUTABLE, ['yarn', 'run']),
    makePathWrapper('yarn', COREPACK_EXECUTABLE, ['yarn']),
    makePathWrapper('yarnpkg', COREPACK_EXECUTABLE, ['yarn']),
    makePathWrapper('node-gyp', COREPACK_EXECUTABLE, ['yarn', 'run', '--top-level', 'node-gyp']),
  ])
}
