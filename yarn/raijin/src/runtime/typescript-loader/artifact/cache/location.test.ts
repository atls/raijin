import assert          from 'node:assert/strict'
import test            from 'node:test'

import envPaths        from 'env-paths'

import { getLocation } from './location.js'

test('should use the user-scoped temporary location', () => {
  assert.equal(getLocation(), envPaths('raijin-typescript-loader').temp)
})
