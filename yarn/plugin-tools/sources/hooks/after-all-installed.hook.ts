import type { Project }          from '@yarnpkg/core'
import type { SpawnSyncReturns } from 'node:child_process'

import { spawnSync }             from 'node:child_process'

import { ppath }                 from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'

const hook = (command: string): string => `${command}`

const git = (args: Array<string>): SpawnSyncReturns<string> =>
  // eslint-disable-next-line n/no-sync
  spawnSync('git', args, { encoding: 'utf-8' })

export const afterAllInstalled = async (project: Project): Promise<void> => {
  if (process.env.GITHUB_ACTIONS) {
    // eslint-disable-next-line no-console
    console.log('AFTER INSTALL HOOK: Execution in GitHub Action')
    return
  }

  if (process.env.IMAGE_PACK) return

  const target = ppath.join(project.cwd, '.config/husky')
  const legacyTarget = ppath.join(target, '_')

  if (await xfs.existsPromise(legacyTarget)) {
    await xfs.removePromise(target)
  }

  if (!(await xfs.existsPromise(target))) {
    await xfs.mkdirPromise(target, { recursive: true })
  }

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

  if (error) throw error
}
