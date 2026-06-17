import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { createGitHubReleaseOptions }  from '../release-create.command.js'
import { isReleaseAlreadyExistsError } from '../release-create.command.js'

test('should create releases with GitHub generated release notes', () => {
  assert.deepEqual(createGitHubReleaseOptions('@atls/yarn-cli', '1.2.3', 'atls', 'raijin'), {
    draft: false,
    generate_release_notes: true,
    make_latest: true,
    name: '@atls/yarn-cli@1.2.3',
    owner: 'atls',
    repo: 'raijin',
    tag_name: '@atls/yarn-cli@1.2.3',
  })
})

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
