import assert                               from 'node:assert/strict'
import { EventEmitter }                     from 'node:events'
import test                                 from 'node:test'

import { createCommandChildProcessOptions } from './child.js'
import { waitForCommandChild }              from './child.js'

test('should create child options from command execution boundary', () => {
  const environment = { NODE_ENV: 'test' }
  const options = createCommandChildProcessOptions({
    invocation: { executionCwd: '/repo/client' } as never,
    env: environment,
    stdio: 'inherit',
  })

  assert.equal(options.cwd, '/repo/client')
  assert.equal(options.env, environment)
  assert.equal(options.stdio, 'inherit')
})

test('should return child exit code', async () => {
  const child = new EventEmitter()
  const result = waitForCommandChild(child as never)

  child.emit('exit', 7)

  assert.equal(await result, 7)
})

test('should reject child process errors', async () => {
  const child = new EventEmitter()
  const result = waitForCommandChild(child as never)
  const error = new Error('spawn failed')

  child.emit('error', error)

  await assert.rejects(result, error)
})
