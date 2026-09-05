import assert            from 'node:assert/strict'
import { execFile }      from 'node:child_process'
import { constants }     from 'node:fs'
import { access }        from 'node:fs/promises'
import { copyFile }      from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { realpath }      from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { delimiter }     from 'node:path'
import { join }          from 'node:path'
import { resolve }       from 'node:path'
import { test }          from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify }     from 'node:util'

test('installed staged hook uses independent TypeScript and Jest projects', async (t) => {
  const execute = promisify(execFile)
  const repoRoot = fileURLToPath(new URL('../../../../../../../', import.meta.url))
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'raijin-installed-staged-')))
  t.after(async () => rm(cwd, { recursive: true, force: true }))
  const environment = { ...process.env }
  const binFolder = environment.BERRY_BIN_FOLDER
  if (binFolder && environment.PATH) {
    environment.PATH = environment.PATH.split(delimiter)
      .filter((path) => path !== binFolder)
      .join(delimiter)
  }
  const gitNames = (await execute('git', ['rev-parse', '--local-env-vars'])).stdout
    .trim()
    .split('\n')
  for (const name of [
    'NODE_OPTIONS',
    'NODE_PATH',
    'NODE_TEST_CONTEXT',
    'RAIJIN_CLI_INVENTORY',
    'RAIJIN_NODE_LOADER',
    'RAIJIN_NODE_LOADER_REGISTRATION',
    'RAIJIN_REGISTERED_PNP_LOADER',
    'YARN_IGNORE_PATH',
    'BERRY_BIN_FOLDER',
    'INIT_CWD',
    'PROJECT_CWD',
    'npm_execpath',
    'npm_node_execpath',
    ...gitNames,
  ])
    Reflect.deleteProperty(environment, name)

  const archive = join(cwd, 'raijin.tgz')
  await execute('yarn', ['workspace', '@atls/raijin', 'pack', '--out', archive], {
    cwd: repoRoot,
    env: environment,
  })
  delete environment.GITHUB_ACTIONS
  delete environment.IMAGE_PACK
  const run = async (command: string, args: Array<string>, directory = cwd): Promise<string> =>
    (await execute(command, args, { cwd: directory, env: environment })).stdout
  const runtime = join(cwd, '.yarn/releases/yarn.mjs')
  const yarn = async (...args: Array<string>): Promise<string> =>
    run(process.execPath, [runtime, ...args])
  const git = async (...args: Array<string>): Promise<string> => run('git', args)
  const { packageManager } = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8')) as {
    packageManager: string
  }
  const client = join(cwd, 'client')
  const backendFile = join(cwd, 'backend/value.ts')
  const clientFile = join(client, 'value.ts')
  const clientTest = join(client, 'value.test.js')

  await mkdir(join(cwd, '.yarn/releases'), { recursive: true })
  await mkdir(join(cwd, 'backend'))
  await mkdir(client)
  await copyFile(join(repoRoot, '.yarn/releases/yarn.mjs'), runtime)
  assert.deepEqual(
    await readFile(runtime),
    await readFile(join(repoRoot, '.yarn/releases/yarn.mjs'))
  )
  await writeFile(join(cwd, '.gitignore'), '.yarn\n.pnp.*\n*.tgz\nnode_modules\n')
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({
      name: 'installed-staged',
      private: true,
      type: 'module',
      packageManager,
      dependencies: { '@atls/raijin': 'file:./raijin.tgz', typescript: '5.9.3' },
    })
  )
  await writeFile(
    join(cwd, '.yarnrc.yml'),
    'nodeLinker: pnp\npnpEnableEsmLoader: true\npnpIgnorePatterns: ["./client/**"]\nyarnPath: .yarn/releases/yarn.mjs\n'
  )
  await writeFile(
    join(cwd, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        target: 'es2022',
      },
      include: ['backend/**/*.ts'],
      exclude: ['client'],
    })
  )
  await writeFile(
    join(client, 'package.json'),
    JSON.stringify({
      name: 'independent-client',
      private: true,
      packageManager,
      scripts: { test: 'jest' },
      devDependencies: { typescript: '6.0.3', jest: '29.7.0' },
      jest: { testEnvironment: 'node', cacheDirectory: '<rootDir>/.yarn/jest-cache' },
    })
  )
  await writeFile(join(client, '.yarnrc.yml'), 'ignorePath: true\nnodeLinker: node-modules\n')
  await writeFile(join(client, 'yarn.lock'), '')
  await writeFile(
    join(client, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        strict: true,
        target: 'es2022',
        types: [],
      },
      include: ['value.ts'],
    })
  )
  await writeFile(backendFile, 'export const value: number = 1\n')
  await writeFile(clientFile, 'export const value: number = 1\n')
  await writeFile(clientTest, "test('client', () => expect(1).toBe(1))\n")
  await git('init', '--quiet')
  await git('config', 'user.name', 'Fixture')
  await git('config', 'user.email', 'fixture@example.invalid')
  await git('config', 'commit.gpgsign', 'false')
  await git('config', 'core.hooksPath', '.git/hooks')
  await git('add', '--all')
  await git('commit', '-m', 'test(common): initial fixture')
  await yarn('install', '--no-immutable')
  await run('corepack', ['yarn', 'install', '--no-immutable'], client)

  assert.equal((await yarn('exec', 'tsc', '--version')).trim(), 'Version 5.9.3')
  assert.equal(
    (await run('corepack', ['yarn', 'exec', 'tsc', '--version'], client)).trim(),
    'Version 6.0.3'
  )
  assert.equal(
    (await run('corepack', ['yarn', 'run', 'test', '--version'], client)).trim(),
    '29.7.0'
  )
  assert.match((await yarn('node', '-p', 'process.versions.pnp')).trim(), /^\d+$/)
  await access(join(client, 'node_modules/jest/package.json'))
  const hooks = await realpath(resolve(cwd, (await git('config', 'core.hooksPath')).trim()))
  assert.equal(hooks, await realpath(join(cwd, '.config/husky')))
  assert.equal(await readFile(join(hooks, 'pre-commit'), 'utf8'), 'yarn commit staged\n')
  await access(join(hooks, 'pre-commit'), constants.X_OK)

  await t.test('explicit project configuration enables the first mixed commit', async () => {
    await writeFile(backendFile, 'export const value: number = 2\n')
    await writeFile(clientFile, 'export const value: number = 2\n')
    await git('add', '--all')
    await assert.rejects(git('commit', '-m', 'test(common): missing setup'), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      assert.match(
        [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
        /No valid configuration/
      )
      return true
    })
    await writeFile(
      join(cwd, 'lint-staged.config.mjs'),
      `export default {
      'backend/**/*.ts': 'yarn typecheck',
      'client/**': (files) => {
        if (files.length) throw new Error('client requires its own lint-staged configuration')
        return []
      },
    }\n`
    )
    await writeFile(
      join(client, 'lint-staged.config.mjs'),
      `export default {
      '*.{ts,js}': () => ['corepack yarn exec tsc --noEmit -p tsconfig.json', 'corepack yarn run test --runInBand --no-cache'],
    }\n`
    )
    await git('add', '--all')
    await git('commit', '-m', 'test(common): configure staged projects')
  })

  await t.test('backend compiler failure blocks the installed hook', async () => {
    await writeFile(backendFile, "export const value: number = 'invalid'\n")
    await git('add', 'backend/value.ts')
    await assert.rejects(git('commit', '-m', 'test(common): backend failure'), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      assert.match([Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''), /TS2322/)
      return true
    })
    await writeFile(backendFile, 'export const value: number = 3\n')
    await git('add', 'backend/value.ts')
    await git('commit', '-m', 'test(common): valid backend')
  })

  await t.test('client uses its own TypeScript compiler', async () => {
    await writeFile(clientFile, "export const value: number = 'invalid'\n")
    await git('add', 'client/value.ts')
    await assert.rejects(git('commit', '-m', 'test(common): client failure'), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      assert.match([Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''), /TS2322/)
      return true
    })
    await writeFile(clientFile, 'export const value: number = 3\n')
    await git('add', 'client/value.ts')
    await git('commit', '-m', 'test(common): valid client')
  })

  await t.test('client Jest assertion failure blocks the installed hook', async () => {
    await writeFile(clientTest, "test('client', () => expect(1).toBe(2))\n")
    await git('add', 'client/value.test.js')
    await assert.rejects(git('commit', '-m', 'test(common): Jest failure'), (error: unknown) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      const output = [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join('')
      assert.match(output, /Expected: 2/)
      assert.match(output, /Received: 1/)
      return true
    })
    await git('restore', '--source=HEAD', '--staged', '--worktree', '--', 'client/value.test.js')
  })

  await t.test('required client configuration cannot fall back to backend checks', async () => {
    await git('rm', 'client/lint-staged.config.mjs')
    await writeFile(clientFile, 'export const value: number = 4\n')
    await git('add', 'client/value.ts')
    await assert.rejects(git('commit', '-m', 'test(common): missing client checks'), (
      error: unknown
    ) => {
      assert.ok(error instanceof Error)
      assert.equal(Reflect.get(error, 'code'), 1)
      assert.match(
        [Reflect.get(error, 'stdout'), Reflect.get(error, 'stderr')].join(''),
        /client requires its own lint-staged configuration/
      )
      return true
    })
  })
})
