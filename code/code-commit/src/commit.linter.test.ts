import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { CommitLinter } from './commit.linter.js'

test('should lint valid commit', async () => {
  const { valid } = await new CommitLinter().lint('feat(common): init')

  assert.ok(valid)
})

test('should lint invalid commit', async () => {
  const { valid, errors } = await new CommitLinter().lint('invalid')

  assert.ok(!valid)
  assert.equal(errors.at(0)?.name, 'subject-empty')
  assert.equal(errors.at(1)?.name, 'type-empty')
})
