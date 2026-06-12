import type { Project }           from '@yarnpkg/core'

import { npath }                  from '@yarnpkg/fslib'

import { resolveCurrentYarnPath } from '../current-yarn-executable.js'

type MakePathWrapper = (name: string, argv0: string, args?: Array<string>) => Promise<void>

export const setupScriptEnvironment = async (
  project: Project,
  _env: NodeJS.ProcessEnv,
  makePathWrapper: MakePathWrapper
): Promise<void> => {
  const yarnPath = resolveCurrentYarnPath(project)

  if (!yarnPath) {
    return
  }

  const yarnBin = npath.fromPortablePath(yarnPath)

  await Promise.all([
    makePathWrapper('run', process.execPath, [yarnBin, 'run']),
    makePathWrapper('yarn', process.execPath, [yarnBin]),
    makePathWrapper('yarnpkg', process.execPath, [yarnBin]),
    makePathWrapper('node-gyp', process.execPath, [yarnBin, 'run', '--top-level', 'node-gyp']),
  ])
}
