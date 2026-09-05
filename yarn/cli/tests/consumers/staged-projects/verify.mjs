import assert from 'node:assert/strict'
import { constants } from 'node:fs'
import { access, readFile, realpath, rename, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'

/** @param {import('node:test').TestContext} t @param {Awaited<ReturnType<import('../fixture.mjs').createFixture>>} fixture */
export const verifyStagedProjects = async (t, { cwd, run, runYarn }) => {
  const backendFile = join(cwd, 'backend/value with spaces.ts')
  const clientCwd = join(cwd, 'client')
  const clientFile = join(clientCwd, 'src/value with spaces.ts')
  const clientTest = join(clientCwd, 'src/value.test.js')
  const clientConfig = join(clientCwd, 'lint-staged.config.mjs')
  /** @param {string[]} args */
  const git = async (args) => runYarn(['exec', 'git', ...args])
  const restore = async () =>
    git([
      'restore',
      '--source=HEAD',
      '--staged',
      '--worktree',
      '--',
      'backend',
      'client/src',
      'client/lint-staged.config.mjs',
    ])

  await run('corepack', ['yarn', 'install', '--no-immutable'], clientCwd)
  await runYarn(['generate', 'project', '--type', 'project'])
  await runYarn(['raijin', 'sync'])

  await t.test('independent compilers, Jest, and installed pre-commit hook', async () => {
    assert.equal((await runYarn(['exec', 'tsc', '--version'])).trim(), 'Version 5.9.3')
    assert.equal(
      (await run('corepack', ['yarn', 'exec', 'tsc', '--version'], clientCwd)).trim(),
      'Version 6.0.3'
    )
    assert.equal(
      (await run('corepack', ['yarn', 'run', 'test', '--version'], clientCwd)).trim(),
      '29.7.0'
    )
    assert.match((await runYarn(['node', '-p', 'process.versions.pnp'])).trim(), /^\d+$/)
    const manifest = JSON.parse(await readFile(join(clientCwd, 'package.json'), 'utf8'))
    assert.equal(manifest.scripts?.typecheck, undefined)
    assert.equal(manifest.devDependencies?.['@atls/raijin'], undefined)
    assert.equal(manifest.dependencies?.['@atls/raijin'], undefined)
    await Promise.all([
      access(join(cwd, '.pnp.cjs')),
      access(join(clientCwd, 'node_modules/typescript/package.json')),
      access(join(clientCwd, 'node_modules/jest/package.json')),
    ])
    const hooksRoot = await realpath(resolve(cwd, (await git(['config', 'core.hooksPath'])).trim()))
    assert.equal(hooksRoot, await realpath(join(cwd, '.config/husky')))
    assert.equal(await readFile(join(hooksRoot, 'pre-commit'), 'utf8'), 'yarn commit staged\n')
    await access(join(hooksRoot, 'pre-commit'), constants.X_OK)
  })

  await t.test('unconfigured setup fails without changing the index', async () => {
    await writeFile(backendFile, 'export const backend: number = 10\n')
    await git(['add', '--all'])
    const index = await git(['diff', '--cached', '--binary'])
    await assert.rejects(git(['commit', '-m', 'test(common): unconfigured setup']), (error) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      assert.match(
        [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
        /No valid configuration/
      )
      return true
    })
    assert.equal(await git(['diff', '--cached', '--binary']), index)
  })

  await t.test('explicit configuration enables the first normal commit', async () => {
    await rename(join(cwd, 'lint-staged.config.mjs.fixture'), join(cwd, 'lint-staged.config.mjs'))
    await rename(join(clientCwd, 'lint-staged.config.mjs.fixture'), clientConfig)
    await git(['add', '--all'])
    await git(['commit', '-m', 'test(common): configure staged checks'])
    assert.equal(await git(['diff', '--cached']), '')
  })

  await t.test('backend-only normal commit', async () => {
    await writeFile(backendFile, 'export const backend: number = 2\n')
    await git(['add', '--', 'backend/value with spaces.ts'])
    await git(['commit', '-m', 'test(common): backend change'])
    assert.equal(
      await git(['show', 'HEAD:backend/value with spaces.ts']),
      'export const backend: number = 2\n'
    )
  })

  await t.test('client-only normal commit', async () => {
    await writeFile(clientFile, 'export const client: number = 2\n')
    await git(['add', '--', 'client/src/value with spaces.ts'])
    await git(['commit', '-m', 'test(common): client change'])
    assert.equal(
      await git(['show', 'HEAD:client/src/value with spaces.ts']),
      'export const client: number = 2\n'
    )
  })

  await t.test('mixed normal commit preserves spaces and partial staging', async () => {
    const staged = 'export const backend: number = 3\n'
    const unstaged = `${staged}export const unstaged = true\n`
    await writeFile(backendFile, staged)
    await writeFile(clientFile, 'export const client: number = 3\n')
    await git(['add', '--', 'backend/value with spaces.ts', 'client/src/value with spaces.ts'])
    await writeFile(backendFile, unstaged)
    await git(['commit', '-m', 'test(common): mixed change'])
    assert.equal(await git(['show', 'HEAD:backend/value with spaces.ts']), staged)
    assert.equal(
      await git(['show', 'HEAD:client/src/value with spaces.ts']),
      'export const client: number = 3\n'
    )
    assert.equal(await readFile(backendFile, 'utf8'), unstaged)
    assert.match(
      await git(['diff', '--', 'backend/value with spaces.ts']),
      /export const unstaged = true/
    )
    await restore()
  })

  /** @param {'backend' | 'client'} owner */
  const compilerFailure = async (owner) => {
    await writeFile(
      backendFile,
      owner === 'backend'
        ? "export const backend: number = 'invalid'\n"
        : 'export const backend: number = 4\n'
    )
    await writeFile(
      clientFile,
      owner === 'client'
        ? "export const client: number = 'invalid'\n"
        : 'export const client: number = 4\n'
    )
    await git(['add', '--', 'backend/value with spaces.ts', 'client/src/value with spaces.ts'])
    const index = await git(['diff', '--cached', '--binary'])
    await assert.rejects(
      git(['commit', '-m', `test(common): ${owner} compiler failure`]),
      (error) => {
        assert.ok(error instanceof Error)
        assert.equal(Reflect.get(error, 'code'), 1)
        assert.match(
          [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
          /TS2322/
        )
        return true
      }
    )
    assert.equal(await git(['diff', '--cached', '--binary']), index)
    assert.equal(await git(['diff']), '')
    await restore()
  }

  await t.test('backend TypeScript failure rolls back the mixed transaction', async () =>
    compilerFailure('backend')
  )
  await t.test('client TypeScript failure rolls back the mixed transaction', async () =>
    compilerFailure('client')
  )

  await t.test(
    'real Jest assertion failure blocks the commit and preserves the index',
    async () => {
      await writeFile(clientTest, "test('client', () => expect(1).toBe(2))\n")
      await git(['add', '--', 'client/src/value.test.js'])
      const index = await git(['diff', '--cached', '--binary'])
      await assert.rejects(git(['commit', '-m', 'test(common): Jest failure']), (error) => {
        assert.ok(error instanceof Error)
        assert.equal(Reflect.get(error, 'code'), 1)
        const output = [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join('')
        assert.match(output, /Expected: 2/)
        assert.match(output, /Received: 1/)
        return true
      })
      assert.equal(await git(['diff', '--cached', '--binary']), index)
      await restore()
    }
  )

  await t.test('missing required client configuration blocks the commit', async () => {
    await writeFile(clientFile, 'export const client: number = 5\n')
    await git(['rm', '--', 'client/lint-staged.config.mjs'])
    await git(['add', '--', 'client/src/value with spaces.ts'])
    const index = await git(['diff', '--cached', '--binary'])
    await assert.rejects(
      git(['commit', '-m', 'test(common): missing client configuration']),
      (error) => {
        assert.ok(error instanceof Error)
        assert.equal(Reflect.get(error, 'code'), 1)
        assert.match(
          [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
          /client requires its own lint-staged configuration/
        )
        return true
      }
    )
    assert.equal(await git(['diff', '--cached', '--binary']), index)
    await restore()
    assert.equal(await git(['diff', '--cached']), '')
    assert.equal(await git(['diff']), '')
    assert.equal((await git(['stash', 'list'])).trim(), '')
    await access(clientConfig)
  })
}
