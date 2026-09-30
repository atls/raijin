import type { Hooks }             from '@yarnpkg/core'

import { applyManagedNodeLoader } from '@atls/raijin/runtime/node/bootstrap'

export const setupScriptEnvironment: NonNullable<Hooks['setupScriptEnvironment']> = async (
  _project,
  env,
  makePathWrapper
) => {
  applyManagedNodeLoader(env)

  const selectedYarnRuntime = process.argv[1]

  await Promise.all([
    makePathWrapper('run', process.execPath, [selectedYarnRuntime, 'run']),
    makePathWrapper('yarn', process.execPath, [selectedYarnRuntime]),
    makePathWrapper('yarnpkg', process.execPath, [selectedYarnRuntime]),
    makePathWrapper('node-gyp', process.execPath, [
      selectedYarnRuntime,
      'run',
      '--top-level',
      'node-gyp',
    ]),
  ])
}
