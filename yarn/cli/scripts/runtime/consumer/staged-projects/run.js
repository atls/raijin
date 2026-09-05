import { constants } from 'node:fs'
import { access } from 'node:fs/promises'
import { readFile } from 'node:fs/promises'
import { realpath } from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { resolve } from 'node:path'

/**
 * @typedef {{ exitCode: number, output: string }} CommitResult
 * @typedef {{ exitCode: number, name: string, output?: Array<string> }} CommitExpectation
 * @typedef {{ backend?: number, client?: number, name: string }} ValidChange
 * @typedef {{ name: string, owner: 'backend' | 'client' }} InvalidTypeScriptChange
 */

/** @param {unknown} error */
const outputFromError = (error) => {
  const commandError = typeof error === 'object' && error !== null ? error : {}

  return `${'stdout' in commandError ? String(commandError.stdout ?? '') : ''}${
    'stderr' in commandError ? String(commandError.stderr ?? '') : ''
  }`
}

/**
 * @param {{
 *   fixtureCwd: string,
 *   run: (command: string, args: Array<string>, cwd?: string) => Promise<string>,
 *   runYarn: (args: Array<string>, cwd?: string) => Promise<string>
 * }} options
 */
export const runStagedProjects = async ({ fixtureCwd, run, runYarn }) => {
  const backendFile = join(fixtureCwd, 'backend/value with spaces.ts')
  const backendTest = join(fixtureCwd, 'backend/value.test.js')
  const clientCwd = join(fixtureCwd, 'client')
  const clientConfig = join(clientCwd, 'lint-staged.config.mjs')
  const clientFile = join(clientCwd, 'src/value with spaces.ts')
  const clientTest = join(clientCwd, 'src/value.test.js')

  /** @param {Array<string>} args */
  const git = (args) => runYarn(['exec', 'git', ...args])
  /** @param {string} message @returns {Promise<CommitResult>} */
  const commit = async (message) => {
    try {
      return { exitCode: 0, output: await git(['commit', '-m', `test(common): ${message}`]) }
    } catch (error) {
      const commandError = typeof error === 'object' && error !== null ? error : {}

      return {
        exitCode:
          'code' in commandError && typeof commandError.code === 'number' ? commandError.code : 1,
        output: outputFromError(error),
      }
    }
  }
  const restore = () =>
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
  /** @param {CommitResult} result @param {CommitExpectation} expectation */
  const assertCommit = (result, expectation) => {
    if (result.exitCode !== expectation.exitCode) {
      throw new Error(`${expectation.name} exited ${result.exitCode}: ${result.output}`)
    }

    for (const fragment of expectation.output ?? []) {
      if (!result.output.includes(fragment)) {
        throw new Error(`${expectation.name} did not report ${fragment}: ${result.output}`)
      }
    }
  }

  await run('corepack', ['yarn', 'install', '--no-immutable'], clientCwd)

  const rootTypeScript = (await runYarn(['exec', 'tsc', '--version'])).trim()
  const clientTypeScript = (
    await run('corepack', ['yarn', 'exec', 'tsc', '--version'], clientCwd)
  ).trim()
  const clientJest = (await run('corepack', ['yarn', 'run', 'test', '--version'], clientCwd)).trim()
  const pnpVersion = (await runYarn(['node', '-p', 'process.versions.pnp'])).trim()
  const clientManifest = JSON.parse(await readFile(join(clientCwd, 'package.json'), 'utf8'))

  if (rootTypeScript !== 'Version 5.9.3') {
    throw new Error(`Backend loaded ${rootTypeScript} instead of TypeScript 5.9.3`)
  }

  if (clientTypeScript !== 'Version 6.0.3') {
    throw new Error(`Client loaded ${clientTypeScript} instead of TypeScript 6.0.3`)
  }

  if (clientJest !== '29.7.0') {
    throw new Error(`Client loaded Jest ${clientJest} instead of 29.7.0`)
  }

  if (!pnpVersion) {
    throw new Error('Backend did not activate its PnP runtime')
  }

  if (clientManifest.scripts?.typecheck || clientManifest.devDependencies?.['@atls/raijin']) {
    throw new Error('Client fixture must not declare a Raijin dependency or typecheck script')
  }

  await Promise.all([
    access(join(fixtureCwd, '.pnp.cjs')),
    access(join(clientCwd, 'node_modules/typescript/package.json')),
    access(join(clientCwd, 'node_modules/jest/package.json')),
  ])

  const hooksPath = (await git(['config', 'core.hooksPath'])).trim()
  const actualHooksRoot = await realpath(resolve(fixtureCwd, hooksPath))
  const expectedHooksRoot = await realpath(join(fixtureCwd, '.config/husky'))
  const hookPath = join(actualHooksRoot, 'pre-commit')
  const hook = await readFile(hookPath, 'utf8')

  if (actualHooksRoot !== expectedHooksRoot) {
    throw new Error(`Checked runtime configured unexpected Git hooks path ${hooksPath}`)
  }

  if (hook !== 'yarn commit staged\n') {
    throw new Error('Checked runtime did not install the executable staged hook')
  }

  await access(hookPath, constants.X_OK)

  await git(['add', '--all'])
  await git(['commit', '--quiet', '--no-verify', '-m', 'test: materialize staged projects'])

  /** @param {ValidChange} input */
  const valid = async ({ name, backend, client }) => {
    await restore()

    if (backend) {
      await writeFile(backendFile, `export const backend: number = ${backend}\n`)
      await git(['add', '--', 'backend/value with spaces.ts'])
    }

    if (client) {
      await writeFile(clientFile, `export const client: number = ${client}\n`)
      await git(['add', '--', 'client/src/value with spaces.ts'])
    }

    const result = await commit(`test: ${name}`)

    assertCommit(result, { exitCode: 0, name })
  }

  await valid({ name: 'backend staged change', backend: 2 })
  await valid({ name: 'client staged change', client: 2 })

  await restore()
  const stagedBackend = 'export const backend: number = 3\n'
  const unstagedBackend = `${stagedBackend}export const unstaged = true\n`
  const stagedClient = 'export const client: number = 3\n'

  await writeFile(backendFile, stagedBackend)
  await writeFile(clientFile, stagedClient)
  await git(['add', '--', 'backend/value with spaces.ts', 'client/src/value with spaces.ts'])
  await writeFile(backendFile, unstagedBackend)

  const mixed = await commit('test: mixed staged changes')

  assertCommit(mixed, { exitCode: 0, name: 'mixed staged changes' })

  const committedBackend = await git(['show', 'HEAD:backend/value with spaces.ts'])
  const committedClient = await git(['show', 'HEAD:client/src/value with spaces.ts'])
  const retainedWorktree = await readFile(backendFile, 'utf8')
  const retainedDiff = await git(['diff', '--', 'backend/value with spaces.ts'])

  if (
    committedBackend !== stagedBackend ||
    committedClient !== stagedClient ||
    retainedWorktree !== unstagedBackend ||
    !retainedDiff.includes('export const unstaged = true')
  ) {
    throw new Error('Mixed commit did not preserve the partially staged file state')
  }

  /** @param {InvalidTypeScriptChange} input */
  const invalidTypeScript = async ({ name, owner }) => {
    await restore()
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
    const result = await commit(`test: ${name}`)

    assertCommit(result, { exitCode: 1, name, output: ['TS2322'] })

    if ((await git(['diff', '--cached', '--binary'])) !== index) {
      throw new Error(`${name} changed the staged state after failure`)
    }
  }

  await invalidTypeScript({ name: 'backend TypeScript failure', owner: 'backend' })
  await invalidTypeScript({ name: 'client TypeScript failure', owner: 'client' })

  await restore()
  await writeFile(clientTest, "test('client', () => expect(1).toBe(2))\n")
  await git(['add', '--', 'client/src/value.test.js'])
  const jestIndex = await git(['diff', '--cached', '--binary'])
  const jest = await commit('test: client Jest failure')

  assertCommit(jest, {
    exitCode: 1,
    name: 'client Jest failure',
    output: ['Expected: 2', 'Received: 1'],
  })

  if ((await git(['diff', '--cached', '--binary'])) !== jestIndex) {
    throw new Error('Client Jest failure changed the staged state')
  }

  await restore()
  await writeFile(clientFile, 'export const client: number = 5\n')
  await git(['rm', '--', 'client/lint-staged.config.mjs'])
  await git(['add', '--', 'client/src/value with spaces.ts'])
  const configIndex = await git(['diff', '--cached', '--binary'])
  const missingConfig = await commit('test: missing client staged configuration')

  assertCommit(missingConfig, {
    exitCode: 1,
    name: 'missing client staged configuration',
    output: ['client requires its own lint-staged configuration'],
  })

  if ((await git(['diff', '--cached', '--binary'])) !== configIndex) {
    throw new Error('Missing client configuration changed the staged state')
  }

  await restore()

  if ((await git(['diff', '--cached'])) || (await git(['diff']))) {
    throw new Error('Staged-project verification left repository changes behind')
  }

  if ((await git(['stash', 'list'])).trim()) {
    throw new Error('Staged-project verification left a lint-staged stash behind')
  }

  await Promise.all([access(backendTest), access(clientTest), access(clientConfig)])
}
