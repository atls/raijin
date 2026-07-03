import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { CommitLinter } from './commit.linter.js'

test('should lint valid commit', async () => {
  const { valid } = await new CommitLinter({}).lint('feat(common): init')

  assert.ok(valid)
})

test('should lint invalid commit', async () => {
  const { valid, errors } = await new CommitLinter({}).lint('invalid')

  assert.ok(!valid)
  assert.equal(errors.at(0)?.name, 'subject-empty')
  assert.equal(errors.at(1)?.name, 'type-empty')
})

test('should allow workspace scopes', async () => {
  const { valid } = await new CommitLinter({ workspaceNames: ['service'] }).lint(
    'fix(service): keep esm externals'
  )

  assert.ok(valid)
})

test('should reject unknown scopes', async () => {
  const { valid, errors } = await new CommitLinter({}).lint('fix(service): keep esm externals')

  assert.ok(!valid)
  assert.ok(errors.some((error) => error.name === 'scope-enum'))
})
