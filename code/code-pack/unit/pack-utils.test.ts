import type { CommandExecutor } from '../src/command.interfaces.js'

import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { npath }                from '@yarnpkg/fslib'
import { xfs }                  from '@yarnpkg/fslib'

import { pack }                 from '../src/pack.js'
import { execOrThrow }          from '../src/pack.utils.js'
import { installPack }          from '../src/pack.utils.js'

const cwd = npath.toPortablePath('/workspace')

const createCommandExecutor = (execute: CommandExecutor['execute']): CommandExecutor => ({
  cwd,
  execute,
})

test('should resolve when command exits with zero code', async () => {
  const commandExecutor = createCommandExecutor(async () => ({
    exitCode: 0,
    stderr: '',
    stdout: '',
  }))

  await assert.doesNotReject(
    execOrThrow(commandExecutor, process.execPath, ['-e', 'process.exit(0)'])
  )
})

test('should reject when command exits with non-zero code', async () => {
  const commandExecutor = createCommandExecutor(async () => ({
    exitCode: 17,
    stderr: '',
    stdout: '',
  }))

  await assert.rejects(
    execOrThrow(commandExecutor, process.execPath, ['-e', 'process.exit(17)']),
    /failed with exit code 17/
  )
})

test('should keep an existing pack installation', async () => {
  const calls: Array<{ command: string; args: Array<string> }> = []
  const commandExecutor = createCommandExecutor(async (command, args) => {
    calls.push({ command, args })

    return { exitCode: 0, stderr: '', stdout: '0.40.4' }
  })

  await installPack({ commandExecutor, cwd })

  assert.deepEqual(calls, [{ command: 'pack', args: ['--version'] }])
})

test('should download and extract pack when it is absent', async () => {
  const calls: Array<{ command: string; args: Array<string> }> = []
  const commandExecutor = createCommandExecutor(async (command, args) => {
    calls.push({ command, args })

    return {
      exitCode: calls.length === 1 ? 1 : 0,
      stderr: '',
      stdout: '',
    }
  })

  await installPack({ commandExecutor, cwd })

  assert.equal(calls[0]?.command, 'pack')
  assert.deepEqual(calls[0]?.args, ['--version'])
  assert.equal(calls[1]?.command, 'curl')
  assert.deepEqual(calls[1]?.args.slice(0, 3), ['-sSL', '-o', '/workspace/pack.tgz'])
  assert.match(calls[1]?.args[3] ?? '', /pack-v0\.40\.4-/)
  assert.deepEqual(calls[2], {
    command: 'tar',
    args: ['-C', '/usr/local/bin/', '--no-same-owner', '-xzv', '/workspace/pack.tgz'],
  })
})

test('should pass the packed destination as the build context', async (t) => {
  const githubEventPath = process.env.GITHUB_EVENT_PATH
  const githubToken = process.env.GITHUB_TOKEN

  delete process.env.GITHUB_EVENT_PATH
  delete process.env.GITHUB_TOKEN

  t.after(() => {
    if (githubEventPath === undefined) {
      delete process.env.GITHUB_EVENT_PATH
    } else {
      process.env.GITHUB_EVENT_PATH = githubEventPath
    }

    if (githubToken === undefined) {
      delete process.env.GITHUB_TOKEN
    } else {
      process.env.GITHUB_TOKEN = githubToken
    }
  })

  await xfs.mktempPromise(async (packCwd) => {
    const calls: Array<{ command: string; args: Array<string> }> = []
    const commandExecutor = createCommandExecutor(async (command, args) => {
      calls.push({ command, args })

      return {
        exitCode: 0,
        stderr: '',
        stdout: command === 'git' ? 'abc123\n' : '',
      }
    })

    await pack(
      {
        builder: 'example/builder',
        buildpack: 'example/buildpack',
        cwd: packCwd,
        publish: false,
        registry: 'registry.example/',
        tagPolicy: 'revision',
        workspace: '@atls/example',
      },
      commandExecutor
    )

    const buildCall = calls.find(({ command, args }) => command === 'pack' && args[0] === 'build')

    assert.ok(buildCall)
    assert.equal(buildCall.args[buildCall.args.indexOf('--path') + 1], packCwd)
  })
})
