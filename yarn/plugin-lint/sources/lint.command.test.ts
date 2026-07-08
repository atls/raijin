import assert              from 'node:assert/strict'
import { test }            from 'node:test'

import { hasLintMessages } from './lint.command.js'

test('should keep lint warnings blocking command success', () => {
  assert.equal(
    hasLintMessages({
      messages: [
        {
          ruleId: 'no-console',
          severity: 1,
        },
      ],
    }),
    true
  )
})

test('should allow lint success without messages', () => {
  assert.equal(
    hasLintMessages({
      messages: [],
    }),
    false
  )
})
