import assert                            from 'node:assert/strict'
import { arch }                          from 'node:os'
import test                              from 'node:test'

import { IMAGE_PACK_NODE_LINKER }        from './pack.utils.js'
import { resolveSupportedArchitectures } from './pack.utils.js'

test('should materialize image pack runtime with PnP linker', () => {
  assert.equal(IMAGE_PACK_NODE_LINKER, 'pnp')
})

test('should resolve Docker linux amd64 platform to Yarn architecture settings', () => {
  assert.deepEqual(
    resolveSupportedArchitectures('linux/amd64'),
    new Map([
      ['os', ['linux']],
      ['cpu', ['x64']],
      ['libc', ['glibc']],
    ])
  )
})

test('should default image pack materialization to linux current cpu', () => {
  assert.deepEqual(
    resolveSupportedArchitectures(undefined),
    new Map([
      ['os', ['linux']],
      ['cpu', [arch()]],
      ['libc', ['glibc']],
    ])
  )
})

test('should normalize Docker platform aliases before Yarn install', () => {
  assert.deepEqual(
    resolveSupportedArchitectures('windows/amd64'),
    new Map([
      ['os', ['win32']],
      ['cpu', ['x64']],
      ['libc', []],
    ])
  )
})
