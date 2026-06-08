import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { createTestExecArgv } from '../src/test-exec-argv.js'

test('should create TypeScript test exec argv without ts-node runtime', () => {
  assert.deepEqual(createTestExecArgv(), [
    '--loader',
    '@atls/code-runtime/typescript-loader',
    '--enable-source-maps',
  ])
})

test('should keep PnP loader before TypeScript test loader', () => {
  assert.deepEqual(createTestExecArgv('file:///repo/.pnp.loader.mjs'), [
    '--loader',
    'file:///repo/.pnp.loader.mjs',
    '--loader',
    '@atls/code-runtime/typescript-loader',
    '--enable-source-maps',
  ])
})
