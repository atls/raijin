import assert                from 'node:assert/strict'
import test                  from 'node:test'

import { npath }             from '@yarnpkg/fslib'

import { createCommandPath } from './path.js'

test('should expose portable and native path representations together', () => {
  const portable = '/repo/client' as never
  const path = createCommandPath(portable)

  assert.equal(path.portable, portable)
  assert.equal(path.native, npath.fromPortablePath(portable))
})
