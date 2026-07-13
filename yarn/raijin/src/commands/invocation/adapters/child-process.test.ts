import assert                        from 'node:assert/strict'
import { EventEmitter }              from 'node:events'
import test                          from 'node:test'

import { createChildProcessOptions } from './child-process.js'
import { waitForChildProcess }       from './child-process.js'

test('should create child options from the execution boundary', () => {
  const environment = { NODE_ENV: 'test' }
  const options = createChildProcessOptions({
    invocation: { executionCwd: '/repo/client' } as never,
    env: environment,
    stdio: 'inherit',
  })

  assert.equal(options.cwd, '/repo/client')
  assert.equal(options.env, environment)
  assert.equal(options.stdio, 'inherit')
})

test('should wait for child stdio to close before returning its code', async () => {
  const child = new EventEmitter()
  const result = waitForChildProcess(child as never)
  let settled = false

  const settlement = result.then(() => {
    settled = true
  })

  child.emit('exit', 7)
  await Promise.resolve()

  assert.equal(settled, false)

  child.emit('close', 7)

  await settlement
  assert.equal(await result, 7)
})

test('should reject child process errors', async () => {
  const child = new EventEmitter()
  const result = waitForChildProcess(child as never)
  const error = new Error('spawn failed')

  child.emit('error', error)
  child.emit('close', 1)

  await assert.rejects(result, error)
})

test('should return a failure code when child closes from a signal', async () => {
  const child = new EventEmitter()
  const result = waitForChildProcess(child as never)

  child.emit('close', null, 'SIGTERM')

  assert.equal(await result, 1)
})
