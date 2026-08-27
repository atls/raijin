import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { getScenarioPolicy } from '../input.js'

test('general permits concurrent files and the long test timeout', () => {
  assert.deepEqual(getScenarioPolicy('general'), {
    concurrency: true,
    testTimeoutMs: 420_000,
  })
})

test('unit permits concurrent files and has the bounded unit timeout', () => {
  assert.deepEqual(getScenarioPolicy('unit'), {
    concurrency: true,
    testTimeoutMs: 240_000,
  })
})

test('integration serializes files and keeps the long test timeout', () => {
  assert.deepEqual(getScenarioPolicy('integration'), {
    concurrency: false,
    testTimeoutMs: 420_000,
  })
})
