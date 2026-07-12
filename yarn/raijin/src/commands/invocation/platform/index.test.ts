import assert                            from 'node:assert/strict'
import test                              from 'node:test'

import { resolveCommandPlatformAdapter } from './index.js'
import { posixCommandPlatformAdapter }   from './posix.js'
import { windowsCommandPlatformAdapter } from './windows.js'

test('should select the Windows command platform adapter', () => {
  assert.equal(resolveCommandPlatformAdapter('win32'), windowsCommandPlatformAdapter)
})

test('should select the POSIX command platform adapter for Unix platforms', () => {
  assert.equal(resolveCommandPlatformAdapter('linux'), posixCommandPlatformAdapter)
  assert.equal(resolveCommandPlatformAdapter('darwin'), posixCommandPlatformAdapter)
  assert.equal(resolveCommandPlatformAdapter('freebsd'), posixCommandPlatformAdapter)
})

test('should preserve POSIX command cwd', () => {
  assert.equal(
    posixCommandPlatformAdapter.resolveNativeCwd('/repo/client' as never),
    '/repo/client'
  )
})

test('should convert a Windows drive portable cwd independently from the host platform', () => {
  assert.equal(
    windowsCommandPlatformAdapter.resolveNativeCwd('/C:/repo/client' as never),
    String.raw`C:\repo\client`
  )
})

test('should convert a Windows UNC portable cwd independently from the host platform', () => {
  assert.equal(
    windowsCommandPlatformAdapter.resolveNativeCwd('//server/share/repo' as never),
    String.raw`\\server\share\repo`
  )
})
