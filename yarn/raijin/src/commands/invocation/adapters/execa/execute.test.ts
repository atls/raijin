import type { Filename }  from '@yarnpkg/fslib'

import assert             from 'node:assert/strict'
import { PassThrough }    from 'node:stream'
import test               from 'node:test'

import { npath }          from '@yarnpkg/fslib'
import { ppath }          from '@yarnpkg/fslib'
import { xfs }            from '@yarnpkg/fslib'

import { executeProcess } from './execute.js'

const createContext = () => {
  const stderr = new PassThrough()
  const stdout = new PassThrough()

  stderr.resume()
  stdout.resume()

  return {
    environment: { NODE_ENV: 'test' },
    stderr,
    stdin: new PassThrough(),
    stdout,
  }
}

test('should execute with attached terminal descriptors', async () => {
  const result = await executeProcess(process.execPath, ['-e', 'process.exit(0)'], {
    context: {
      environment: process.env,
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
    cwd: process.cwd(),
    env: process.env,
  })

  assert.deepEqual(result, { exitCode: 0, stderr: '', stdout: '' })
})

test('should ignore process input when requested', async () => {
  const result = await executeProcess(process.execPath, ['-e', 'process.stdin.resume()'], {
    context: createContext(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
  })

  assert.equal(result.exitCode, 0)
})

test('should capture and forward process output before returning its code', async () => {
  const context = createContext()
  const forwarded: Array<Buffer> = []

  context.stdout.on('data', (data: Buffer) => forwarded.push(data))

  const result = await executeProcess(process.execPath, ['-e', "process.stdout.write('ready')"], {
    context,
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture', forward: true },
  })

  assert.equal(result.exitCode, 0)
  assert.equal(result.stdout, 'ready')
  assert.equal(Buffer.concat(forwarded).toString(), 'ready')
})

test('should handle process output without exposing provider streams', async () => {
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const result = await executeProcess(
    process.execPath,
    ['-e', "process.stdout.write('ready'); process.stderr.write('warning')"],
    {
      context: createContext(),
      cwd: process.cwd(),
      env: process.env,
      input: 'ignore',
      output: { mode: 'handle', handler: (event) => events.push(event) },
    }
  )

  assert.equal(result.stdout, '')
  assert.equal(result.stderr, '')
  assert.deepEqual(
    events.sort((left, right) => left.source.localeCompare(right.source)),
    [
      { data: 'warning', source: 'stderr' },
      { data: 'ready', source: 'stdout' },
    ]
  )
})

test('should reject process errors', async () => {
  await assert.rejects(
    executeProcess('raijin-missing-executable', [], {
      context: createContext(),
      cwd: process.cwd(),
      env: process.env,
      input: 'ignore',
      output: { mode: 'capture' },
    }),
    /Unable to execute process: raijin-missing-executable/
  )
})

test('should stop a process after the configured timeout', async () => {
  const result = await executeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    context: createContext(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
    timeout: 20,
  })

  assert.equal(result.exitCode, 124)
})

test('should translate cancellation to the process exit contract', async () => {
  const result = await executeProcess(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    context: createContext(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
    signal: AbortSignal.timeout(20),
  })

  assert.equal(result.exitCode, 1)
})

test(
  'should translate signal termination to the process exit contract',
  { skip: process.platform === 'win32' },
  async () => {
    const result = await executeProcess(
      process.execPath,
      ['-e', "process.kill(process.pid, 'SIGTERM')"],
      {
        context: createContext(),
        cwd: process.cwd(),
        env: process.env,
        input: 'ignore',
        output: { mode: 'capture' },
      }
    )

    assert.deepEqual(result, { exitCode: 1, stderr: '', stdout: '' })
  }
)

test(
  'should execute Windows command wrappers without a shell option',
  { skip: process.platform !== 'win32' },
  async () => {
    const cwd = await xfs.mktempPromise()
    const command = ppath.join(cwd, 'fixture.cmd' as Filename)

    await xfs.writeFilePromise(command, '@echo off\r\necho ready\r\n')

    const result = await executeProcess(npath.fromPortablePath(command), [], {
      context: createContext(),
      cwd: npath.fromPortablePath(cwd),
      env: process.env,
      input: 'ignore',
      output: { mode: 'capture' },
    })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout.trim(), 'ready')
  }
)
