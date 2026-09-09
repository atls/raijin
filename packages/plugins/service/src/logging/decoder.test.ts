import assert               from 'node:assert/strict'
import test                 from 'node:test'

import { LogRecordDecoder } from './decoder.js'

test('buffers partial JSON records independently for stdout and stderr', () => {
  const decoder = new LogRecordDecoder()

  assert.deepEqual(decoder.push({ data: '{"body":"std', source: 'stdout' }), [])
  assert.deepEqual(decoder.push({ data: 'err', source: 'stderr' }), [])
  assert.deepEqual(decoder.push({ data: 'out","severityNumber":9}\nplain\n', source: 'stdout' }), [
    { body: 'stdout', severityNumber: 9 },
    { body: 'plain', severityNumber: 9 },
  ])
  assert.deepEqual(decoder.flush(), [{ body: 'err', severityNumber: 9 }])
})

test('preserves JSON that is not a logger record as plain application output', () => {
  const decoder = new LogRecordDecoder()
  const lines = [
    '{"result":"ok"}',
    '{"body":{"result":"ok"}}',
    '{"record":null}',
    '["result","ok"]',
  ]

  assert.deepEqual(
    decoder.push({ data: `${lines.join('\n')}\n`, source: 'stdout' }),
    lines.map((body) => ({ body, severityNumber: 9 }))
  )
})
