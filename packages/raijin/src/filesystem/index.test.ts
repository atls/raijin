import assert      from 'node:assert/strict'
import { test }    from 'node:test'

import * as facade from './index.js'

test('should expose only the filesystem contract', () => {
  assert.deepEqual(Object.keys(facade).sort(), ['discoverFiles', 'toNativePath', 'toPortablePath'])
  assert.equal('selectPathAdapter' in facade, false)
  assert.equal('createOptions' in facade, false)
})
