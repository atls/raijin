import assert                from 'node:assert/strict'
import test                  from 'node:test'

import { selectPathAdapter } from './convert.js'

test('should convert Windows drive paths independently from the host platform', () => {
  const adapter = selectPathAdapter('win32')

  assert.equal(adapter.toNative('/C:/repo/client' as never), String.raw`C:\repo\client`)
  assert.equal(adapter.toPortable(String.raw`C:\repo\client`), '/C:/repo/client')
})

test('should preserve paths on Unix platforms', () => {
  assert.equal(selectPathAdapter('linux').toNative('/repo/client' as never), '/repo/client')
  assert.equal(selectPathAdapter('darwin').toNative('/repo/client' as never), '/repo/client')
  assert.equal(selectPathAdapter('freebsd').toNative('/repo/client' as never), '/repo/client')
  assert.equal(selectPathAdapter('linux').toPortable('/repo/client'), '/repo/client')
})

test('should convert Windows UNC paths independently from the host platform', () => {
  const adapter = selectPathAdapter('win32')

  assert.equal(adapter.toNative('//server/share/repo' as never), String.raw`\\server\share\repo`)
  assert.equal(adapter.toPortable(String.raw`\\server\share\repo`), '//server/share/repo')
})
