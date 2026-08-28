import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { parseTestExecArgv } from '../runtime-argv.js'

test('accepts only an explicit string-array exec argv override', () => {
  assert.deepEqual(parseTestExecArgv('["--trace-warnings"]'), ['--trace-warnings'])
  assert.deepEqual(parseTestExecArgv('{"invalid":true}'), [])
  assert.deepEqual(parseTestExecArgv('invalid json'), [])
})
