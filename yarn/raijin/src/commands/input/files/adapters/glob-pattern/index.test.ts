import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { selectGlobPatternAdapter } from './index.js'

test('should preserve portable patterns on POSIX', () => {
  const adapter = selectGlobPatternAdapter('linux')

  assert.equal(adapter.toGlobby('/repo/src/**/*.ts'), '/repo/src/**/*.ts')
  assert.equal(adapter.toGlobby('src/**/*.ts'), 'src/**/*.ts')
})

test('should adapt portable drive patterns for globby on Windows', () => {
  const adapter = selectGlobPatternAdapter('win32')

  assert.equal(adapter.toGlobby('/C:/repo/src/**/*.ts'), 'C:/repo/src/**/*.ts')
  assert.equal(adapter.toGlobby('!/C:/repo/src/**/*.test.ts'), '!C:/repo/src/**/*.test.ts')
  assert.equal(adapter.toGlobby('src/**/*.ts'), 'src/**/*.ts')
  assert.equal(adapter.toGlobby('//server/share/src/**/*.ts'), '//server/share/src/**/*.ts')
})
