import assert                  from 'node:assert/strict'
import { test }                from 'node:test'

import { createProxyTestArgs } from './abstract-test.command.jsx'

test('should keep proxy test file targets as separate arguments', () => {
  assert.deepEqual(
    createProxyTestArgs({
      files: ['/repo/src/a.test.ts', '/repo/src/b.test.ts'],
      watch: true,
      target: '/repo',
      testReporter: 'tap',
    }),
    ['/repo/src/a.test.ts', '/repo/src/b.test.ts', '-w', '-t', '/repo', '--test-reporter=tap']
  )
})
