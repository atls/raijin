import type { CommandContext }       from '@yarnpkg/core'
import type { PluginConfiguration }  from '@yarnpkg/core'

import assert                        from 'node:assert/strict'
import { mkdir }                     from 'node:fs/promises'
import { mkdtemp }                   from 'node:fs/promises'
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
import { ts }                        from '@atls/raijin/typescript'

import { TypeCheckCommand }          from '../command.jsx'
import { plugin }                    from '../plugin.js'

const capture = (stream: PassThrough): (() => string) => {
  let output = ''

  stream.setEncoding('utf8')
  stream.on('data', (chunk: string) => {
    output += chunk
  })

  return () => output
}

type CommandHarness = {
  readonly cli: Cli<CommandContext>
  readonly plugins: PluginConfiguration
}

const createCli = (): CommandHarness => {
  const plugins = getPluginConfiguration()

  plugins.modules.set('@atls/yarn-plugin-typescript', plugin)
  plugins.plugins.add('@atls/yarn-plugin-typescript')

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
  stdout: PassThrough,
  invocationCwd: string = cwd
): CommandContext =>
  ({
    colorDepth: 8,
    cwd: toPortableCwd(cwd),
    env: { ...process.env, INIT_CWD: invocationCwd },
    plugins,
    quiet: false,
    stderr,
    stdin: new PassThrough(),
    stdout,
  }) as CommandContext

test('parses explicit typecheck files', () => {
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const command = cli.process(
    ['typecheck', 'src/index.ts'],
    createContext(plugins, process.cwd(), stderr, stdout)
  )

  assert.ok(command instanceof TypeCheckCommand)
  assert.deepEqual(command.args, ['src/index.ts'])
})

test('writes TypeScript diagnostics and returns their exit code', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-'))
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(join(cwd, 'index.ts'), 'export const value: string = 1\n')

  const exitCode = await cli.run(['typecheck'], createContext(plugins, cwd, stderr, stdout))

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /not assignable to type/)
  assert.equal(readStderr(), '')
})

test('discovers a nested project from invocation cwd instead of execution cwd', async (t) => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-nested-'))
  const workspaceCwd = join(projectCwd, 'packages/app')
  const invocationCwd = join(workspaceCwd, 'src')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(projectCwd, { recursive: true, force: true }))

  await mkdir(invocationCwd, { recursive: true })
  await writeFile(
    join(projectCwd, 'package.json'),
    '{"private":true,"workspaces":["packages/*"]}\n'
  )
  await writeFile(join(projectCwd, 'tsconfig.json'), '{"files":["root.ts"]}\n')
  await writeFile(join(projectCwd, 'root.ts'), 'export const root = true\n')
  await writeFile(
    join(workspaceCwd, 'package.json'),
    '{"name":"app","version":"1.0.0","type":"module"}\n'
  )
  await writeFile(join(workspaceCwd, 'tsconfig.json'), '{"files":["src/index.ts"]}\n')
  await writeFile(join(invocationCwd, 'index.ts'), 'export const nested: string = 1\n')

  const exitCode = await cli.run(
    ['typecheck'],
    createContext(plugins, projectCwd, stderr, stdout, invocationCwd)
  )

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /not assignable to type/)
  assert.equal(readStderr(), '')
})

test('does not use a config above the active project root', async (t) => {
  const parentCwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-parent-'))
  const projectCwd = join(parentCwd, 'project')
  const cwd = join(projectCwd, 'packages/app')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(parentCwd, { recursive: true, force: true }))

  await mkdir(cwd, { recursive: true })
  await writeFile(join(parentCwd, 'tsconfig.json'), '{"files":["parent.ts"]}\n')
  await writeFile(join(parentCwd, 'parent.ts'), 'export const parentValue = true\n')
  await writeFile(
    join(projectCwd, 'package.json'),
    '{"private":true,"workspaces":["packages/*"]}\n'
  )
  await writeFile(join(cwd, 'package.json'), '{"name":"app","version":"1.0.0","type":"module"}\n')
  await writeFile(join(cwd, 'index.ts'), 'export const value = true\n')

  const exitCode = await cli.run(
    ['typecheck'],
    createContext(plugins, projectCwd, stderr, stdout, cwd)
  )

  assert.equal(exitCode, 1)
  assert.equal(readStderr(), `TypeScript project not found in ${cwd}; provide explicit files.\n`)
  assert.equal(readStdout(), '')
})

test('normalizes explicit files from invocation cwd without reading project policy', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-files-'))
  const invocationCwd = join(cwd, 'src')
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(invocationCwd, { recursive: true })
  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","typecheckSkipLibCheck":"invalid"}\n'
  )
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"compilerOptions":{"skipLibCheck":true},"files":[]}\n'
  )
  await writeFile(join(invocationCwd, 'selected.d.ts'), 'export declare const value: MissingType\n')

  const exitCode = await cli.run(
    ['typecheck', 'selected.d.ts'],
    createContext(plugins, cwd, stderr, stdout, invocationCwd)
  )

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /Cannot find name 'MissingType'/)
  assert.equal(readStderr(), '')
})

test('writes managed policy errors to stderr', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-policy-'))
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module","typecheckSkipLibCheck":"true"}\n')

  const exitCode = await cli.run(['typecheck'], createContext(plugins, cwd, stderr, stdout))

  assert.equal(exitCode, 1)
  assert.equal(readStderr(), `Invalid typecheckSkipLibCheck in ${cwd}: expected boolean.\n`)
  assert.equal(readStdout(), '')
})

test('writes unexpected provider exceptions without converting the outcome', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-provider-'))
  const { cli, plugins } = createCli()
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  t.mock.method(ts.sys, 'fileExists', () => {
    throw new Error('provider failed')
  })

  const exitCode = await cli.run(['typecheck'], createContext(plugins, cwd, stderr, stdout))

  assert.equal(exitCode, 1)
  assert.equal(readStderr(), 'Error: provider failed\n')
  assert.equal(readStdout(), '')
})
