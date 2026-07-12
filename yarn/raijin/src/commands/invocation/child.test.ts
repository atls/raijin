import assert                               from 'node:assert/strict'
import { EventEmitter }                     from 'node:events'
import test                                 from 'node:test'

import { createCommandChildProcessOptions } from './child.js'
import { waitForCommandChild }              from './child.js'

test('should create child options from command execution boundary', () => {
  const environment = { NODE_ENV: 'test' }
  const options = createCommandChildProcessOptions({
    invocation: { cwd: { execution: { native: '/repo/client' } } } as never,
    env: environment,
    stdio: 'inherit',
  })

  assert.equal(options.cwd, '/repo/client')
  assert.equal(options.env, environment)
  assert.equal(options.stdio, 'inherit')
})

test('should wait for child stdio to close before returning its code', async () => {
  const child = new EventEmitter()
  const result = waitForCommandChild(child as never)
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
  const result = waitForCommandChild(child as never)
  const error = new Error('spawn failed')

  child.emit('error', error)
  child.emit('close', 1)

  await assert.rejects(result, error)
})

test('should return a failure code when child closes from a signal', async () => {
  const child = new EventEmitter()
  const result = waitForCommandChild(child as never)

  child.emit('close', null, 'SIGTERM')

  assert.equal(await result, 1)
})
