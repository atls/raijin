import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PluginConfiguration }     from '@yarnpkg/core'

import assert                           from 'node:assert/strict'
import { mkdir }                        from 'node:fs/promises'
import { mkdtemp }                      from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { join }                         from 'node:path'
import { PassThrough }                  from 'node:stream'
import { test }                         from 'node:test'

import { Cli }                          from 'clipanion'

import { composeCommandInvocations }    from '@atls/raijin/commands'
import { toPortableCwd }                from '@atls/raijin/commands'
import { ts }                           from '@atls/raijin/typescript'

import { TypeCheckCommand }             from './command.jsx'
import { plugin }                       from './plugin.js'

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
    modules: new Map([['@atls/yarn-plugin-typescript', plugin]]),
    plugins: new Set(['@atls/yarn-plugin-typescript']),
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

const assignContext = (
  command: TypeCheckCommand,
  cwd: string,
  stderr: PassThrough,
  stdout: PassThrough,
  manifestRaw: Record<string, unknown> = {},
  projectCwd: string = cwd
): void => {
  const portableCwd = toPortableCwd(cwd)
  const portableProjectCwd = toPortableCwd(projectCwd)
  const workspace = {
    cwd: portableCwd,
    manifest: { raw: manifestRaw },
  }
  const topLevelWorkspace =
    projectCwd === cwd
      ? workspace
      : {
          cwd: portableProjectCwd,
          manifest: { raw: {} },
        }

  command.context = {
    invocation: {
      executionCwd: portableCwd,
      invocationCwd: portableCwd,
      project: {
        cwd: portableProjectCwd,
        topLevelWorkspace,
      },
      workspace,
    },
    stderr,
    stdout,
  } as unknown as WorkspaceCommandContext
}

test('parses explicit typecheck files', () => {
  const command = createCli().process(['typecheck', 'src/index.ts'])

  assert.ok(command instanceof TypeCheckCommand)
  assert.deepEqual(command.args, ['src/index.ts'])
})

test('writes TypeScript diagnostics and returns their exit code', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-'))
  const command = createCli().process(['typecheck'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"files":["index.ts"]}\n')
  await writeFile(join(cwd, 'index.ts'), 'export const value: string = 1\n')

  assert.ok(command instanceof TypeCheckCommand)
  assignContext(command, cwd, stderr, stdout)

  const exitCode = await TypeCheckCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /not assignable to type/)
  assert.equal(readStderr(), '')
})

test('does not use a config above the active project root', async (t) => {
  const parentCwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-parent-'))
  const projectCwd = join(parentCwd, 'project')
  const cwd = join(projectCwd, 'packages/app')
  const command = createCli().process(['typecheck'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(parentCwd, { recursive: true, force: true }))

  await mkdir(cwd, { recursive: true })
  await writeFile(join(parentCwd, 'tsconfig.json'), '{"files":["parent.ts"]}\n')
  await writeFile(join(parentCwd, 'parent.ts'), 'export const parentValue = true\n')
  await writeFile(join(projectCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'index.ts'), 'export const value = true\n')

  assert.ok(command instanceof TypeCheckCommand)
  assignContext(command, cwd, stderr, stdout, {}, projectCwd)

  const exitCode = await TypeCheckCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.equal(
    readStderr(),
    `TypeScript project not found in ${cwd}; provide explicit files.\n`
  )
  assert.equal(readStdout(), '')
})

test('writes managed policy errors to stderr', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-policy-'))
  const command = createCli().process(['typecheck'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  assert.ok(command instanceof TypeCheckCommand)
  assignContext(command, cwd, stderr, stdout, { typecheckSkipLibCheck: 'true' })

  const exitCode = await TypeCheckCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.equal(readStderr(), `Invalid typecheckSkipLibCheck in ${cwd}: expected boolean.\n`)
  assert.equal(readStdout(), '')
})

test('writes unexpected provider exceptions without converting the outcome', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-command-provider-'))
  const command = createCli().process(['typecheck'])
  const stderr = new PassThrough()
  const stdout = new PassThrough()
  const readStderr = capture(stderr)
  const readStdout = capture(stdout)

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  t.mock.method(ts.sys, 'fileExists', () => {
    throw new Error('provider failed')
  })

  assert.ok(command instanceof TypeCheckCommand)
  assignContext(command, cwd, stderr, stdout)

  const exitCode = await TypeCheckCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.equal(readStderr(), 'Error: provider failed\n')
  assert.equal(readStdout(), '')
})
