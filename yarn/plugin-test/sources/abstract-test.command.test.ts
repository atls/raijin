import assert             from 'node:assert/strict'
import { test }           from 'node:test'

import { createTestArgs } from './abstract-test.command.jsx'

test('should keep test file targets as separate arguments', () => {
  assert.deepEqual(
    createTestArgs({
      files: ['/repo/src/a.test.ts', '/repo/src/b.test.ts'],
      watch: true,
      target: '/repo',
      testReporter: 'tap',
    }),
    ['/repo/src/a.test.ts', '/repo/src/b.test.ts', '-w', '-t', '/repo', '--test-reporter=tap']
  )
})
