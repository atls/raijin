import assert                         from 'node:assert/strict'
import { EventEmitter }               from 'node:events'
import { PassThrough }                from 'node:stream'
import test                           from 'node:test'

import { createChildProcessOptions }  from './child-process.js'
import { executeChildProcess }        from './child-process.js'
import { forwardChildProcessSignals } from './child-process.js'

const createContext = () => ({
  environment: { NODE_ENV: 'test' },
  stderr: new PassThrough(),
  stdin: new PassThrough(),
  stdout: new PassThrough(),
})

test('should create child options from the execution boundary', () => {
  const context = createContext()
  const environment = { NODE_ENV: 'test' }
  const options = createChildProcessOptions({
    context,
    cwd: '/repo/client',
    env: environment,
  })

  assert.equal(options.cwd, '/repo/client')
  assert.equal(options.env, environment)
  assert.deepEqual(options.stdio, ['pipe', 'pipe', 'pipe'])
})

test('should attach file descriptor streams without proxy pipes', () => {
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

  assert.deepEqual(options.stdio, [context.stdin, context.stdout, context.stderr])
})

test('should reserve output pipes for capture policies', () => {
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
    output: { mode: 'capture' },
  })

  assert.deepEqual(options.stdio, [context.stdin, 'pipe', 'pipe'])
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

test('should forward process signals while the child is active', () => {
  const signalTarget = new EventEmitter()
  const child = new EventEmitter() as EventEmitter & {
    exitCode: number | null
    kill: (signal: NodeJS.Signals) => boolean
    signalCode: NodeJS.Signals | null
    signals: Array<NodeJS.Signals>
  }

  child.exitCode = null
  child.signalCode = null
  child.signals = []
  child.kill = (signal): boolean => {
    child.signals.push(signal)

    return true
  }

  forwardChildProcessSignals(child as never, signalTarget as never)

  signalTarget.emit('SIGTERM')
  signalTarget.emit('SIGTERM')

  assert.deepEqual(child.signals, ['SIGTERM', 'SIGTERM'])

  child.emit('close', 0)
  child.exitCode = 0
  signalTarget.emit('SIGTERM')

  assert.deepEqual(child.signals, ['SIGTERM', 'SIGTERM'])
})
