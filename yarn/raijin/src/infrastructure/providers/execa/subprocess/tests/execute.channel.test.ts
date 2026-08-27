import assert          from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { test }        from 'node:test'

import { execute }     from '../execute.js'

const createStreams = () => {
  const stderr = new PassThrough()
  const stdout = new PassThrough()

  stderr.resume()
  stdout.resume()

  return {
    stderr,
    stdin: new PassThrough(),
    stdout,
  }
}

test('exchanges structured messages over one subprocess IPC channel', async () => {
  const result = await execute(
    process.execPath,
    [
      '-e',
      [
        "process.once('message', (message) => {",
        '  process.send({ received: message }, () => process.disconnect())',
        '})',
      ].join('\n'),
    ],
    {
      channel: { input: { scenario: 'unit' } },
      cwd: process.cwd(),
      env: process.env,
      forceKillAfterDelay: false,
      input: 'ignore',
      output: { mode: 'capture' },
      streams: createStreams(),
    }
  )

  assert.equal(result.reason, 'completed')
  assert.deepEqual(result.messages, [{ received: { scenario: 'unit' } }])
})

test('does not synthesize SIGINT while cancelling an IPC subprocess', async () => {
  const result = await execute(
    process.execPath,
    [
      '-e',
      [
        "process.on('SIGINT', () => process.send({ signal: 'SIGINT' }))",
        "process.once('message', () => setInterval(() => undefined, 1000))",
      ].join('\n'),
    ],
    {
      cancelSignal: AbortSignal.timeout(100),
      channel: { input: { scenario: 'unit' } },
      cwd: process.cwd(),
      env: process.env,
      forceKillAfterDelay: false,
      input: 'ignore',
      output: { mode: 'capture' },
      streams: createStreams(),
    }
  )

  assert.equal(result.reason, 'cancelled')
  assert.equal(
    result.messages?.some((message) => JSON.stringify(message).includes('SIGINT')),
    false
  )
})
