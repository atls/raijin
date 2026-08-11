import type { Filename } from '@yarnpkg/fslib'

import assert            from 'node:assert/strict'
import { PassThrough }   from 'node:stream'
import test              from 'node:test'

import { npath }         from '@yarnpkg/fslib'
import { ppath }         from '@yarnpkg/fslib'
import { xfs }           from '@yarnpkg/fslib'

import { execute }       from './execute.js'

const createStreams = () => {
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
  const result = await execute(process.execPath, ['-e', 'process.exit(0)'], {
    streams: {
      stderr: process.stderr,
      stdin: process.stdin,
      stdout: process.stdout,
    },
    cwd: process.cwd(),
    env: process.env,
  })

  assert.deepEqual(result, { reason: 'completed', exitCode: 0, stderr: '', stdout: '' })
})

test('should ignore process input when requested', async () => {
  const result = await execute(process.execPath, ['-e', 'process.stdin.resume()'], {
    streams: createStreams(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
  })

  assert.equal(result.reason, 'completed')
  assert.equal(result.exitCode, 0)
})

test('should capture and forward process output before returning its code', async () => {
  const streams = createStreams()
  const forwarded: Array<Buffer> = []

  streams.stdout.on('data', (data: Buffer) => forwarded.push(data))

  const result = await execute(process.execPath, ['-e', "process.stdout.write('ready')"], {
    streams,
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture', forward: true },
  })

  assert.equal(result.reason, 'completed')
  assert.equal(result.exitCode, 0)

  assert.equal(result.stdout, 'ready')
  assert.equal(Buffer.concat(forwarded).toString(), 'ready')
})

test('should handle process output without exposing provider streams', async () => {
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const result = await execute(
    process.execPath,
    ['-e', "process.stdout.write('ready'); process.stderr.write('warning')"],
    {
      streams: createStreams(),
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

test('should classify an output handler failure independently from process completion', async () => {
  const failure = new Error('handler failed')
  const result = await execute(process.execPath, ['-e', "process.stdout.write('ready')"], {
    streams: createStreams(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: {
      mode: 'handle',
      handler: () => {
        throw failure
      },
    },
  })

  assert.equal(result.reason, 'output-failed')
  assert.equal(result.cause, failure)
  assert.equal(result.exitCode, 0)
})

test('should preserve process start failures as a typed result', async () => {
  const result = await execute('raijin-missing-executable', [], {
    streams: createStreams(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
  })

  assert.equal(result.reason, 'start-failed')
  assert.ok(result.cause)
})

test('should stop a process after the configured timeout', async () => {
  const result = await execute(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    streams: createStreams(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
    timeoutMs: 20,
  })

  assert.equal(result.reason, 'timed-out')
  assert.ok(result.cause)
})

test('should translate cancellation to the process exit contract', async () => {
  const result = await execute(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    streams: createStreams(),
    cwd: process.cwd(),
    env: process.env,
    input: 'ignore',
    output: { mode: 'capture' },
    cancelSignal: AbortSignal.timeout(20),
  })

  assert.equal(result.reason, 'cancelled')
  assert.ok(result.cause)
})

test(
  'should translate signal termination to the process exit contract',
  { skip: process.platform === 'win32' },
  async () => {
    const result = await execute(process.execPath, ['-e', "process.kill(process.pid, 'SIGTERM')"], {
      streams: createStreams(),
      cwd: process.cwd(),
      env: process.env,
      input: 'ignore',
      output: { mode: 'capture' },
    })

    assert.equal(result.reason, 'signalled')
    assert.equal(result.signal, 'SIGTERM')
    assert.ok(result.cause)
  }
)

test(
  'should execute Windows command wrappers without a shell option',
  { skip: process.platform !== 'win32' },
  async () => {
    const cwd = await xfs.mktempPromise()
    const command = ppath.join(cwd, 'fixture.cmd' as Filename)

    await xfs.writeFilePromise(command, '@echo off\r\necho ready\r\n')

    const result = await execute(npath.fromPortablePath(command), [], {
      streams: createStreams(),
      cwd: npath.fromPortablePath(cwd),
      env: process.env,
      input: 'ignore',
      output: { mode: 'capture' },
    })

    assert.equal(result.reason, 'completed')
    assert.equal(result.exitCode, 0)

    assert.equal(result.stdout.trim(), 'ready')
  }
)
