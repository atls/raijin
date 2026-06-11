import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { isReleaseAlreadyExistsError } from '../release-create.command.js'

test('should detect existing release tag errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 422,
      message:
        'Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}',
    }),
    true
  )
})

test('should ignore other GitHub validation errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 422,
      message: 'Validation Failed: {"resource":"Release","code":"already_exists","field":"name"}',
    }),
    false
  )
})

test('should ignore non-validation errors', () => {
  assert.equal(
    isReleaseAlreadyExistsError({
      status: 500,
      message:
        'Validation Failed: {"resource":"Release","code":"already_exists","field":"tag_name"}',
    }),
    false
  )
})
