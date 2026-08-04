import assert                        from 'node:assert/strict'
import { mkdtemp }                   from 'node:fs/promises'
import { writeFile }                 from 'node:fs/promises'
import { tmpdir }                    from 'node:os'
import { join }                      from 'node:path'
import { PassThrough }               from 'node:stream'
import test                          from 'node:test'

import { createChildProcessOptions } from './child-process.js'
import { executeChildProcess }       from './child-process.js'

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

test('should create Execa options from the execution boundary', () => {
  const context = createContext()
  const environment = { NODE_ENV: 'test' }
  const options = createChildProcessOptions({
    context,
    cwd: '/repo/client',
    env: environment,
  })

  assert.equal(options.cwd, '/repo/client')
  assert.equal(options.env, environment)
  assert.equal(options.extendEnv, false)
  assert.equal(options.input, undefined)
  assert.notEqual(options.stdin, context.stdin)
  assert.deepEqual(options.stdout, ['pipe', context.stdout])
  assert.deepEqual(options.stderr, ['pipe', context.stderr])
  assert.equal(options.buffer, false)
  assert.equal(options.reject, false)
  assert.equal(options.stripFinalNewline, false)
})

test('should attach terminal descriptors directly', () => {
  const context = {
    environment: { NODE_ENV: 'test' },
    stderr: Object.assign(new PassThrough(), { fd: 2 }),
    stdin: Object.assign(new PassThrough(), { fd: 0 }),
    stdout: Object.assign(new PassThrough(), { fd: 1 }),
  }
  const options = createChildProcessOptions({
    context,
    cwd: '/repo/client',
    env: { NODE_ENV: 'test' },
  })

  assert.equal(options.input, undefined)
  assert.equal(options.stdin, context.stdin)
  assert.equal(options.stdout, context.stdout)
  assert.equal(options.stderr, context.stderr)
})

test('should reserve output pipes for capture policies', () => {
  const context = createContext()
  const options = createChildProcessOptions({
    context,
    cwd: '/repo/client',
    env: { NODE_ENV: 'test' },
    output: { mode: 'capture' },
  })

  assert.equal(options.input, undefined)
  assert.notEqual(options.stdin, context.stdin)
  assert.equal(options.stdout, 'pipe')
  assert.equal(options.stderr, 'pipe')
  assert.equal(options.buffer, true)
})

test('should capture and forward child output before returning its code', async () => {
  const context = createContext()
  const forwarded: Array<Buffer> = []

  context.stdout.on('data', (data: Buffer) => forwarded.push(data))

  const result = await executeChildProcess(
    process.execPath,
    ['-e', "process.stdout.write('ready')"],
    {
      context,
      cwd: process.cwd(),
      env: process.env,
      output: { mode: 'capture', forward: true },
    }
  )

  assert.equal(result.exitCode, 0)
  assert.equal(result.termination, 'exit')
  assert.equal(result.stdout, 'ready')
  assert.equal(Buffer.concat(forwarded).toString(), 'ready')
})

test('should handle child output without exposing process streams', async () => {
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const result = await executeChildProcess(
    process.execPath,
    ['-e', "process.stdout.write('ready'); process.stderr.write('warning')"],
    {
      context: createContext(),
      cwd: process.cwd(),
      env: process.env,
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

test('should reject child process errors', async () => {
  await assert.rejects(
    executeChildProcess('raijin-missing-executable', [], {
      context: createContext(),
      cwd: process.cwd(),
      env: process.env,
    }),
    /ENOENT/
  )
})

test('should stop a child after the configured timeout', async () => {
  const result = await executeChildProcess(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    {
      context: createContext(),
      cwd: process.cwd(),
      env: process.env,
      timeout: 20,
    }
  )

  assert.equal(result.exitCode, 124)
  assert.equal(result.termination, 'timeout')
  assert.equal(result.timedOut, true)
})

test(
  'should preserve signal termination semantics',
  { skip: process.platform === 'win32' },
  async () => {
    const result = await executeChildProcess(
      process.execPath,
      ['-e', "process.kill(process.pid, 'SIGTERM')"],
      {
        context: createContext(),
        cwd: process.cwd(),
        env: process.env,
      }
    )

    assert.equal(result.exitCode, 143)
    assert.equal(result.signal, 'SIGTERM')
    assert.equal(result.termination, 'signal')
    assert.equal(result.timedOut, false)
  }
)

test(
  'should execute Windows command wrappers without a shell option',
  { skip: process.platform !== 'win32' },
  async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'raijin-execa-cmd-'))
    const command = join(cwd, 'fixture.cmd')

    await writeFile(command, '@echo off\r\necho ready\r\n')

    const result = await executeChildProcess(command, [], {
      context: createContext(),
      cwd,
      env: process.env,
      output: { mode: 'capture' },
    })

    assert.equal(result.exitCode, 0)
    assert.equal(result.stdout.trim(), 'ready')
  }
)
