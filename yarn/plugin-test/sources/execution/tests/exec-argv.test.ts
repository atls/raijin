import assert                 from 'node:assert/strict'
import { test }               from 'node:test'

import { createTestExecArgv } from '../exec-argv.js'
import { parseTestExecArgv }  from '../exec-argv.js'

test('keeps the PnP loader before the TypeScript test loader', () => {
  assert.deepEqual(createTestExecArgv('file:///repo/.pnp.loader.mjs'), [
    '--loader',
    'file:///repo/.pnp.loader.mjs',
    '--loader',
    '@atls/raijin/typescript-loader',
    '--enable-source-maps',
  ])
})

test('accepts only an explicit string-array exec argv override', () => {
  assert.deepEqual(parseTestExecArgv('["--trace-warnings"]'), ['--trace-warnings'])
  assert.deepEqual(parseTestExecArgv('{"invalid":true}'), [])
  assert.deepEqual(parseTestExecArgv('invalid json'), [])
})
