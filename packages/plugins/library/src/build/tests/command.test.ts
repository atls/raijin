import type { CommandContext }       from '@yarnpkg/core'
import type { PluginConfiguration }  from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import { mkdir }                     from 'node:fs/promises'
import { mkdtemp }                   from 'node:fs/promises'
import { readFile }                  from 'node:fs/promises'
import { rm }                        from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import { PassThrough }               from 'node:stream'
import { test }                      from 'node:test'

import { getPluginConfiguration }    from '@yarnpkg/cli'
import { Cli }                       from 'clipanion'

import { composeCommandInvocations } from '@atls/raijin/commands'
import { toPortableCwd }             from '@atls/raijin/commands'

import { LibraryBuildCommand }       from '../command.jsx'
import { plugin }                    from '../../plugin.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

const createCli = (): { cli: Cli<CommandContext>; plugins: PluginConfiguration } => {
  const plugins = getPluginConfiguration()

  plugins.modules.set('@atls/yarn-plugin-library', plugin)
  plugins.plugins.add('@atls/yarn-plugin-library')
  composeCommandInvocations(plugins)

  const cli = new Cli<CommandContext>({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })
  const [CommandClass] = plugin.commands ?? []

  assert.ok(CommandClass)
  cli.register(CommandClass)

  return { cli, plugins }
}

const createContext = (
  plugins: PluginConfiguration,
  cwd: string,
  stderr: PassThrough,
  stdout: PassThrough
): CommandContext =>
  ({
    colorDepth: 8,
    cwd: toPortableCwd(cwd),
    env: { ...process.env, INIT_CWD: cwd },
    plugins,
    quiet: false,
    stderr,
    stdin: new PassThrough(),
    stdout,
  }) as CommandContext

const createProject = async (source: string): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-library-command-'))

  await mkdir(join(cwd, 'src'))
  await writeFile(join(cwd, 'package.json'), '{"name":"fixture","type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"module":"NodeNext","moduleResolution":"NodeNext","rootDir":"src","target":"es2022"},"include":["src/**/*"]}\n'
  )
  await writeFile(join(cwd, 'src/index.ts'), source)

  return cwd
}

test('parses a custom artifact target', () => {
  const { cli, plugins } = createCli()
  const command = cli.process(
    ['library', 'build', '--target', './output'],
    createContext(plugins, process.cwd(), new PassThrough(), new PassThrough())
  )

  assert.ok(command instanceof LibraryBuildCommand)
  assert.equal(command.target, './output')
})

test('builds a library without durable progress output on a non-interactive stream', async (t) => {
  const cwd = await createProject('export const value = true\n')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const exitCode = await cli.run(['library', 'build'], createContext(plugins, cwd, stderr, stdout))

  assert.equal(exitCode, 0)
  assert.equal(readStdout(), '')
  assert.equal(readStderr(), '')
  assert.match(await readFile(join(cwd, 'dist/index.js'), 'utf8'), /value = true/)
  await readFile(join(cwd, 'dist/index.d.ts'), 'utf8')
})

test('writes normalized compiler diagnostics and returns failure', async (t) => {
  const cwd = await createProject('export const value: string = 1\n')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const exitCode = await cli.run(['library', 'build'], createContext(plugins, cwd, stderr, stdout))

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /TS2322/)
  assert.match(readStdout(), /not assignable to type/)
  assert.equal(readStderr(), '')
})

test('finishes interactive progress before writing a durable diagnostic', async (t) => {
  const cwd = await createProject('export const value: string = 1\n')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStdout = capture(stdout)

  Reflect.set(stdout, 'columns', 80)
  Reflect.set(stdout, 'isTTY', true)
  t.after(async () => rm(cwd, { force: true, recursive: true }))

  const exitCode = await cli.run(['library', 'build'], createContext(plugins, cwd, stderr, stdout))
  const output = readStdout()
  const progress = output.indexOf('Building library')
  const progressClear = output.indexOf('\u001B[2K')
  const diagnostic = output.indexOf('TS2322')

  assert.equal(exitCode, 1)
  assert.match(output, /Building library/)
  assert.doesNotMatch(output, /\d+%/)
  assert.ok(diagnostic > progress)
  if (progressClear >= 0) assert.ok(diagnostic > progressClear)
})

test('writes provider exceptions at the command boundary', async (t) => {
  const cwd = await createProject('export const value = true\n')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { force: true, recursive: true }))
  await writeFile(join(cwd, 'blocked'), 'not a directory\n')

  const exitCode = await cli.run(
    ['library', 'build', '--target', './blocked/dist'],
    createContext(plugins, cwd, stderr, stdout)
  )

  assert.equal(exitCode, 1)
  assert.match(readStderr(), /EEXIST/)
  assert.equal(readStdout(), '')
})
