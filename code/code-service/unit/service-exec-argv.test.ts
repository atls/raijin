import assert                    from 'node:assert/strict'
import test                      from 'node:test'

import { createServiceExecArgv } from '../src/service-exec-argv.js'

test('should expose service exec argv through runtime contract', () => {
  assert.deepEqual(
    createServiceExecArgv('file:///repo/.pnp.loader.mjs', 'file:///runtime/typescript-loader.js'),
    [
      '--loader',
      'file:///repo/.pnp.loader.mjs',
      '--loader',
      'file:///runtime/typescript-loader.js',
      '--enable-source-maps',
    ]
  )
})
