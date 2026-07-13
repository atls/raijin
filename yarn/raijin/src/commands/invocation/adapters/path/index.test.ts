import assert                from 'node:assert/strict'
import test                  from 'node:test'

import { selectPathAdapter } from './index.js'

test('should select the Windows path adapter', () => {
  assert.equal(
    selectPathAdapter('win32').toNative('/C:/repo/client' as never),
    String.raw`C:\repo\client`
  )
})

test('should select the POSIX path adapter for Unix platforms', () => {
  assert.equal(selectPathAdapter('linux').toNative('/repo/client' as never), '/repo/client')
  assert.equal(selectPathAdapter('darwin').toNative('/repo/client' as never), '/repo/client')
  assert.equal(selectPathAdapter('freebsd').toNative('/repo/client' as never), '/repo/client')
})

test('should convert a Windows UNC cwd independently from the host platform', () => {
  assert.equal(
    selectPathAdapter('win32').toNative('//server/share/repo' as never),
    String.raw`\\server\share\repo`
  )
})
