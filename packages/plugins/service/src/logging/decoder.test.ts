import assert               from 'node:assert/strict'
import test                 from 'node:test'

import { LogRecordDecoder } from './decoder.js'

test('buffers partial JSON records independently for stdout and stderr', () => {
  const decoder = new LogRecordDecoder()

  assert.deepEqual(decoder.push({ data: '{"body":"std', source: 'stdout' }), [])
  assert.deepEqual(decoder.push({ data: 'err', source: 'stderr' }), [])
  assert.deepEqual(decoder.push({ data: 'out"}\nplain\n', source: 'stdout' }), [
    { body: 'stdout' },
    { body: 'plain', severityNumber: 9 },
  ])
  assert.deepEqual(decoder.flush(), [{ body: 'err', severityNumber: 9 }])
})
