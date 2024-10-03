import type { Project }          from '@yarnpkg/core'
import type { SpawnSyncReturns } from 'node:child_process'

import { spawnSync }             from 'node:child_process'
import { platform }              from 'node:os'

import { ppath }                 from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'

const hook = (command: string): string => `${command}`

const git = (args: Array<string>): SpawnSyncReturns<string> =>
  spawnSync('git', args, { encoding: 'utf-8' })

const hooksExists = (): boolean => {
  const { error, output } = git(['config', 'core.hooksPath'])

  if (error) {
    return false
  }

  return Boolean(output.at(1))
}

export const afterAllInstalled = async (project: Project): Promise<void> => {
  const target = ppath.join(project.cwd, '.config/husky')

  await xfs.writeFilePromise(ppath.join(target, 'commit-msg'), hook('yarn commit message lint'), {
    mode: 0o755,
  })

  await xfs.writeFilePromise(ppath.join(target, 'pre-commit'), hook('yarn commit staged'), {
    mode: 0o755,
  })

  await xfs.writeFilePromise(
    ppath.join(target, 'prepare-commit-msg'),
    hook('yarn commit message $@'),
    { mode: 0o755 }
  )

  const { error } = git(['config', 'core.hooksPath', target])

  if (error) {
    throw error
  }
}
