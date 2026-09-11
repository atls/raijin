import assert                  from 'node:assert/strict'
import test                    from 'node:test'

import { CommitMessagePolicy } from '../policy.js'

const createPolicy = (): CommitMessagePolicy =>
  new CommitMessagePolicy(['common', 'github', 'service'])

test('should lint valid commit', async () => {
  const { valid } = await createPolicy().lint('feat(common): init')

  assert.ok(valid)
})

test('should lint invalid commit', async () => {
  const { valid, errors } = await createPolicy().lint('invalid')

  assert.ok(!valid)
  assert.equal(errors.at(0)?.name, 'subject-empty')
  assert.equal(errors.at(1)?.name, 'type-empty')
})

test('should allow workspace scopes', async () => {
  const policy = createPolicy()
  const { valid } = await policy.lint('fix(service): keep esm externals')

  assert.ok(valid)
  assert.deepEqual(policy.allowedScopes, ['common', 'github', 'service'])
})

test('should allow default ignored merge commits', async () => {
  const { valid, errors } = await createPolicy().lint("Merge branch 'main' into feature")

  assert.ok(valid)
  assert.deepEqual(errors, [])
})

test('should allow multiple scopes', async () => {
  const { valid } = await createPolicy().lint('fix(common,github): update workflow')

  assert.ok(valid)
})

test('should allow breaking change header shorthand', async () => {
  assert.equal((await createPolicy().lint('feat(common)!: drop old API')).valid, true)

  const { valid, errors } = await createPolicy().lint('feat!: drop old API')

  assert.equal(valid, false)
  assert.deepEqual(
    errors.map((error) => error.name),
    ['scope-empty']
  )
})

test('should lint breaking change footer line length', async () => {
  const { valid, errors } = await createPolicy().lint(
    ['feat(common): update runtime', '', `BREAKING CHANGE: ${'runtime '.repeat(20)}`].join('\n')
  )

  assert.ok(!valid)
  assert.ok(errors.some((error) => error.name === 'footer-max-line-length'))
})

test('should reject unknown scopes', async () => {
  const { valid, errors } = await createPolicy().lint('fix(unknown): keep esm externals')

  assert.ok(!valid)
  assert.ok(errors.some((error) => error.name === 'scope-enum'))
})
