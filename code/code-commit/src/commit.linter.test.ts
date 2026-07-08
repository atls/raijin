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

test('should allow default ignored merge commits', async () => {
  const { valid, errors } = await new CommitLinter({}).lint("Merge branch 'main' into feature")

  assert.ok(valid)
  assert.deepEqual(errors, [])
})

test('should allow multiple scopes', async () => {
  const { valid } = await new CommitLinter({}).lint('fix(common,github): update workflow')

  assert.ok(valid)
})

test('should allow breaking change header shorthand', async () => {
  assert.equal((await new CommitLinter({}).lint('feat(common)!: drop old API')).valid, true)

  const { valid, errors } = await new CommitLinter({}).lint('feat!: drop old API')

  assert.equal(valid, false)
  assert.deepEqual(
    errors.map((error) => error.name),
    ['scope-empty']
  )
})

test('should lint breaking change footer line length', async () => {
  const { valid, errors } = await new CommitLinter({}).lint(
    ['feat(common): update runtime', '', `BREAKING CHANGE: ${'runtime '.repeat(20)}`].join('\n')
  )

  assert.ok(!valid)
  assert.ok(errors.some((error) => error.name === 'footer-max-line-length'))
})

test('should reject unknown scopes', async () => {
  const { valid, errors } = await new CommitLinter({}).lint('fix(service): keep esm externals')

  assert.ok(!valid)
  assert.ok(errors.some((error) => error.name === 'scope-enum'))
})
