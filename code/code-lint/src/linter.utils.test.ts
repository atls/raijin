import assert               from 'node:assert/strict'
import test                 from 'node:test'

import { createLintResult } from './linter.utils.js'

test('should count ESLint warnings and errors by severity', () => {
  const result = createLintResult('/repo/src/index.ts', '', [
    {
      column: 1,
      line: 1,
      message: 'warning',
      ruleId: 'warning-rule',
      severity: 1,
    },
    {
      column: 1,
      line: 2,
      message: 'error',
      ruleId: 'error-rule',
      severity: 2,
    },
  ])

  assert.equal(result.warningCount, 1)
  assert.equal(result.errorCount, 1)
})
