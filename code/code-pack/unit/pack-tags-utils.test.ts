import assert                      from 'node:assert/strict'
import test                        from 'node:test'

import { getPackImageTags }        from '../src/pack-tags.utils.js'
import { normalizeAdditionalTags } from '../src/pack-tags.utils.js'

test('should keep default computed and latest tags', () => {
  assert.deepEqual(getPackImageTags('registry.example.com/app', 'revision'), [
    'registry.example.com/app:revision',
    'registry.example.com/app:latest',
  ])
})

test('should append additional image tag aliases', () => {
  assert.deepEqual(
    getPackImageTags('registry.example.com/app', 'revision', ['stage', 'production']),
    [
      'registry.example.com/app:revision',
      'registry.example.com/app:latest',
      'registry.example.com/app:stage',
      'registry.example.com/app:production',
    ]
  )
})

test('should reject empty additional image tag alias', () => {
  assert.throws(() => normalizeAdditionalTags(['']), /Invalid image tag alias/)
})

test('should reject image tag alias outside the supported safe subset', () => {
  assert.throws(() => normalizeAdditionalTags(['stage/latest']), /Invalid image tag alias/)
})
