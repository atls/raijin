import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PluginConfiguration }     from '@yarnpkg/core'

import assert                           from 'node:assert/strict'
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

import { TypeCheckCommand }             from '../command.jsx'
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

test('should parse explicit typecheck targets', () => {
  const command = createCli().process(['typecheck', 'src/index.ts'])

  assert.ok(command instanceof TypeCheckCommand)
  assert.deepEqual(command.args, ['src/index.ts'])
})

test('should present diagnostics and return the operation exit code', async (t) => {
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

  command.context = {
    invocation: {
      executionCwd: toPortableCwd(cwd),
      invocationCwd: toPortableCwd(cwd),
      project: { cwd: toPortableCwd(cwd) },
    },
    stderr,
    stdout,
  } as unknown as WorkspaceCommandContext

  const exitCode = await TypeCheckCommand.prototype.execute.call(command)

  assert.equal(exitCode, 1)
  assert.match(readStdout(), /not assignable to type/)
  assert.equal(readStderr(), '')
})
