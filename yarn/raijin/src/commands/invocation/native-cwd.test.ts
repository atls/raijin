import assert                      from 'node:assert/strict'
import test                        from 'node:test'

import { resolveNativeCommandCwd } from './native-cwd.js'

test('should preserve command cwd on POSIX', { skip: process.platform === 'win32' }, () => {
  assert.equal(resolveNativeCommandCwd('/repo/client' as never), '/repo/client')
})

test('should convert command cwd on Windows', { skip: process.platform !== 'win32' }, () => {
  assert.equal(resolveNativeCommandCwd('/C:/repo/client' as never), String.raw`C:\repo\client`)
})
