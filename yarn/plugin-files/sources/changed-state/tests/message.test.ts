import type { ChangedStateManagedError } from '../interfaces/result.js'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { formatChangedStateManagedError } from '../message.js'

const cases: ReadonlyArray<readonly [ChangedStateManagedError, string]> = [
  [
    { kind: 'error', reason: 'incomplete-event', eventName: 'pull_request' },
    'GitHub pull_request event context is incomplete',
  ],
  [
    {
      kind: 'error',
      reason: 'incomplete-pull-request-files',
      expected: 3001,
      received: 3000,
      limit: 3000,
    },
    'GitHub pull request file list is incomplete: expected 3001, received 3000, provider limit 3000',
  ],
  [
    { kind: 'error', reason: 'invalid-comparison', source: 'push' },
    'push changed state does not define two comparable Git objects',
  ],
  [
    { kind: 'error', reason: 'missing-token' },
    'Pull request changed state requires GITHUB_TOKEN',
  ],
  [
    { kind: 'error', reason: 'stale-pull-request' },
    'GitHub pull request changed after the selected event snapshot',
  ],
  [
    { kind: 'error', reason: 'unsupported-event', eventName: 'schedule' },
    'GitHub event "schedule" does not provide changed project state',
  ],
]

test('formats every managed error through an explicit discriminant branch', () => {
  cases.forEach(([error, message]) => {
    assert.equal(formatChangedStateManagedError(error), message)
  })
})
