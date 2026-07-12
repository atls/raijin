import type { Project }      from '@yarnpkg/core'
import type { Filename }     from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { execFile }          from 'node:child_process'
import test                  from 'node:test'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'
import { xfs }               from '@yarnpkg/fslib'

import { afterAllInstalled } from './after-all-installed.hook.js'

const execFileAsync = async (
  file: string,
  args: Array<string>,
  options: { cwd?: string } = {}
): Promise<{ stdout: string }> =>
  new Promise((resolve, reject) => {
    execFile(file, args, options, (error, stdout) => {
      if (error) {
        reject(error)

        return
      }

      resolve({ stdout })
    })
  })

test('should materialize Husky hooks as newline-terminated text files', async () => {
  const cwd = await xfs.mktempPromise()
  const hooksPath = ppath.join(cwd, '.config/husky')
  const previousGitHubActions = process.env.GITHUB_ACTIONS
  const previousImagePack = process.env.IMAGE_PACK

  await execFileAsync('git', ['init'], { cwd: npath.fromPortablePath(cwd) })

  delete process.env.GITHUB_ACTIONS
  delete process.env.IMAGE_PACK

  try {
    await afterAllInstalled({ cwd } as Project)
  } finally {
    if (previousGitHubActions === undefined) delete process.env.GITHUB_ACTIONS
    else process.env.GITHUB_ACTIONS = previousGitHubActions

    if (previousImagePack === undefined) delete process.env.IMAGE_PACK
    else process.env.IMAGE_PACK = previousImagePack
  }

  const hookNames: Array<Filename> = [
    'commit-msg' as Filename,
    'pre-commit' as Filename,
    'prepare-commit-msg' as Filename,
  ]
  const hooks = await Promise.all(
    hookNames.map(async (name) => xfs.readFilePromise(ppath.join(hooksPath, name), 'utf-8'))
  )
  const { stdout } = await execFileAsync('git', ['config', 'core.hooksPath'], {
    cwd: npath.fromPortablePath(cwd),
  })

  for (const hookContent of hooks) assert.match(hookContent, /\n$/)

  assert.equal(stdout.trim(), npath.fromPortablePath(hooksPath))
})
