import assert               from 'node:assert/strict'
import { readFile }         from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { createRepository } from './repository.fixture.js'
import { git }              from './repository.fixture.js'
import { run }              from './repository.fixture.js'

const driver = new URL('./cwd.fixture.ts', import.meta.url)

for (const form of ['separate', 'equals']) {
  test(`honors native Yarn --cwd (${form}) without touching the calling repository`, async (t) => {
    const caller = await createRepository(t)
    const target = await createRepository(t)

    await writeFile(join(caller, 'file with spaces.txt'), 'INVALID caller\n')
    await git(caller, 'add', '--', 'file with spaces.txt')
    const callerIndex = await git(caller, 'diff', '--cached', '--binary')
    const callerWorktree = await git(caller, 'diff', '--binary')
    await writeFile(
      join(target, 'package.json'),
      JSON.stringify({
        name: 'backend',
        'lint-staged': { '*.txt': 'node check.mjs backend' },
      })
    )
    await rm(join(target, '.lintstagedrc.json'))
    await writeFile(join(target, 'file with spaces.txt'), 'unformatted staged\n')
    await writeFile(join(target, 'client/file with spaces.txt'), 'unformatted staged\n')
    await git(target, 'add', '--all')

    const args = form === 'separate' ? ['--cwd', target] : [`--cwd=${target}`]
    const result = await run(caller, process.env, driver, [...args, 'commit', 'staged'])

    assert.equal(result.code, 0, result.output)
    assert.match(result.output, /STAGED_CWD_RESTORED/)
    assert.equal(await git(target, 'show', ':file with spaces.txt'), 'formatted staged\n')
    assert.equal(await git(target, 'show', ':client/file with spaces.txt'), 'formatted staged\n')
    assert.equal(await git(caller, 'diff', '--cached', '--binary'), callerIndex)
    assert.equal(await git(caller, 'diff', '--binary'), callerWorktree)
    assert.equal(await readFile(join(caller, 'file with spaces.txt'), 'utf8'), 'INVALID caller\n')
    assert.equal(await git(caller, 'stash', 'list'), '')
    assert.equal(await git(target, 'stash', 'list'), '')
  })
}

for (const [failure, diagnostic] of [
  ['check', /INVALID/],
  ['configuration', /Invalid value|Invalid configuration/i],
  ['directory', /ENOENT|chdir/],
] as const) {
  test(`restores the native CLI cwd after ${failure} failure`, async (t) => {
    const caller = await createRepository(t)
    const target = await createRepository(t)

    await writeFile(join(target, 'file with spaces.txt'), 'INVALID staged\n')
    if (failure === 'configuration') {
      await writeFile(join(target, '.lintstagedrc.json'), JSON.stringify({ '*.txt': null }))
    }
    await git(target, 'add', '--all')
    const targetIndex = await git(target, 'diff', '--cached', '--binary')
    const cwd = failure === 'directory' ? join(target, 'missing directory') : target
    const result = await run(caller, process.env, driver, ['--cwd', cwd, 'commit', 'staged'])

    assert.equal(result.code, 1, result.output)
    assert.match(result.output, /STAGED_CWD_RESTORED/)
    assert.match(result.output, diagnostic)
    assert.equal(await git(target, 'diff', '--cached', '--binary'), targetIndex)
    assert.equal(await git(target, 'diff'), '')
    assert.equal(await git(caller, 'status', '--porcelain'), '')
  })
}
