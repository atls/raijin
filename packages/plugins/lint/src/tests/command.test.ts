import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PluginConfiguration }     from '@yarnpkg/core'

import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { readFile }                     from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { stat }                         from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import { PassThrough }                  from 'node:stream'
import { test }                         from 'node:test'

import { Cli }                          from 'clipanion'

import { composeCommandInvocations }    from '@atls/raijin/commands'
import { toPortableCwd }                from '@atls/raijin/commands'

import { LintCommand }                  from '../command.js'
import { plugin }                       from '../plugin.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

const createCli = (): Cli => {
  const configuration: PluginConfiguration = {
    modules: new Map([['@atls/yarn-plugin-lint', plugin]]),
    plugins: new Set(['@atls/yarn-plugin-lint']),
  }

  composeCommandInvocations(configuration)

  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  const [CommandClass] = plugin.commands ?? []

  assert.ok(CommandClass)
  cli.register(CommandClass)

  return cli
}

test('should parse fix, cache, and explicit targets', () => {
  const command = createCli().process(['lint', '--fix', '--cache', 'source.ts'])

  assert.ok(command instanceof LintCommand)
  assert.equal(command.fix, true)
  assert.equal(command.cache, true)
  assert.deepEqual(command.files, ['source.ts'])
})

test('should write ESLint diagnostics and return their exit code', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-lint-command-'))
  const sourceFile = join(cwd, 'source.ts')
  const command = createCli().process(['lint', '--fix', '--cache', 'source.ts'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(join(cwd, '.config/eslint'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"strict":true},"files":["source.ts"]}\n'
  )
  await writeFile(
    join(cwd, 'eslint.config.mjs'),
    "export default [{ files: ['**/*.ts'], rules: { semi: ['error', 'always'], 'no-console': 'error' } }]\n"
  )
  await writeFile(sourceFile, "console.log('value')\n")

  command.context = {
    invocation: {
      executionCwd: toPortableCwd(cwd),
      invocationCwd: toPortableCwd(cwd),
      project: { cwd: toPortableCwd(cwd) },
    },
    stderr,
    stdout,
  } as unknown as WorkspaceCommandContext

  const exitCode = await LintCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /no-console/)
  assert.match(readStdout(), /1 problem/)
  assert.equal(readStderr(), '')
  assert.equal(await readFile(sourceFile, 'utf8'), "console.log('value');\n")
  assert.equal((await stat(join(cwd, '.config/eslint/.eslintcache'))).isFile(), true)
})

test('should write provider failures to stderr and return exit one', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-lint-provider-failure-'))
  const command = createCli().process(['lint', 'missing[1].ts'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":[]}\n')

  command.context = {
    invocation: {
      executionCwd: toPortableCwd(cwd),
      invocationCwd: toPortableCwd(cwd),
      project: { cwd: toPortableCwd(cwd) },
    },
    stderr,
    stdout,
  } as unknown as WorkspaceCommandContext

  const exitCode = await LintCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.match(readStderr(), /No files matching/)
  assert.equal(readStdout(), '')
})
