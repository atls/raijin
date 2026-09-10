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
    '{"body":"ok","severityNumber":9,"record":null}',
    '{"record":{"details":"missing message"},"severityNumber":17}',
    '{"record":{"message":"invalid details","details":3},"severityNumber":17}',
    '{"record":"wrong severity","severityNumber":9}',
    '{"body":"ok","severityNumber":9,"attributes":{"@namespace":{}}}',
    '{"body":"ok","severityNumber":9,"attributes":{"@stack":[]}}',
    '{"body":"ok","severityNumber":9,"attributes":{"@mikro-orm-sql":{}}}',
    '{"body":"ok","severityNumber":9,"attributes":{"@mikro-orm-params":[{}]}}',
    '["result","ok"]',
  ]

  assert.deepEqual(
    decoder.push({ data: `${lines.join('\n')}\n`, source: 'stdout' }),
    lines.map((body) => ({ body, severityNumber: 9 }))
  )
})

test('decodes logger records with renderable attributes', () => {
  const decoder = new LogRecordDecoder()
  const record = {
    attributes: {
      '@mikro-orm-params': ['42'],
      '@mikro-orm-sql': 'select * from users where id = ?',
      '@namespace': 'service:api',
      '@stack': 'Error: Request failed',
      custom: { nested: true },
    },
    body: 'Request failed',
    severityNumber: 9,
  }

  assert.deepEqual(decoder.push({ data: `${JSON.stringify(record)}\n`, source: 'stdout' }), [
    record,
  ])
})

test('decodes valid build diagnostics', () => {
  const decoder = new LogRecordDecoder()

  assert.deepEqual(
    decoder.push({
      data: [
        '{"record":"build warning","severityNumber":13}',
        '{"record":{"message":"build failed","details":"stack"},"severityNumber":17}',
      ]
        .join('\n')
        .concat('\n'),
      source: 'stderr',
    }),
    [
      { record: 'build warning', severityNumber: 13 },
      { record: { message: 'build failed', details: 'stack' }, severityNumber: 17 },
    ]
  )
})
