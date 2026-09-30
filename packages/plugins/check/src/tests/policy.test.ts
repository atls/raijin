import assert             from 'node:assert/strict'
import { PassThrough }    from 'node:stream'
import { test }           from 'node:test'

import { runCheckStages } from '../policy.js'

const capture = () => {
  const stream = new PassThrough()
  let output = ''

  stream.on('data', (data: Buffer) => {
    output += data.toString()
  })

  return { stream, output: () => output }
}

test('runs every capability in policy order and preserves a failed terminal result', async () => {
  const stdout = capture()
  const stderr = capture()
  const completed: Array<string> = []
  const exitCode = await runCheckStages(
    [
      {
        name: 'Format',
        run: async () => {
          completed.push('Format')
          return 0
        },
      },
      {
        name: 'Lint',
        run: async () => {
          completed.push('Lint')
          return 1
        },
      },
      {
        name: 'TypeCheck',
        run: async () => {
          completed.push('TypeCheck')
          return 0
        },
      },
      {
        name: 'Test:unit',
        run: async () => {
          completed.push('Test:unit')
          return 0
        },
      },
      {
        name: 'Test:integration',
        run: async () => {
          completed.push('Test:integration')
          return 0
        },
      },
    ],
    stdout.stream,
    stderr.stream
  )

  assert.equal(exitCode, 1)
  assert.deepEqual(completed, ['Format', 'Lint', 'TypeCheck', 'Test:unit', 'Test:integration'])
  assert.equal(stderr.output(), '')
  assert.equal(stdout.output(), 'Format\nLint\nTypeCheck\nTest:unit\nTest:integration\n')
})

test('reports a capability exception and continues remaining checks', async () => {
  const stdout = capture()
  const stderr = capture()
  let continued = false
  const exitCode = await runCheckStages(
    [
      {
        name: 'Format',
        run: async () => {
          throw new Error('provider failed')
        },
      },
      {
        name: 'TypeCheck',
        run: async () => {
          continued = true
          return 0
        },
      },
    ],
    stdout.stream,
    stderr.stream
  )

  assert.equal(exitCode, 1)
  assert.equal(continued, true)
  assert.equal(stderr.output(), 'Format: provider failed\n')
})
