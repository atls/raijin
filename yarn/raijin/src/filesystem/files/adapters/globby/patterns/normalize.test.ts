import assert        from 'node:assert/strict'
import { test }      from 'node:test'

import { normalize } from './normalize.js'

test('should preserve portable patterns on POSIX', () => {
  assert.equal(normalize('/repo/src/**/*.ts', 'linux'), '/repo/src/**/*.ts')
  assert.equal(normalize('src/**/*.ts', 'darwin'), 'src/**/*.ts')
})

test('should adapt portable drive patterns for Globby on Windows', () => {
  assert.equal(normalize('/C:/repo/src/**/*.ts', 'win32'), 'C:/repo/src/**/*.ts')
  assert.equal(normalize('!/C:/repo/src/**/*.test.ts', 'win32'), '!C:/repo/src/**/*.test.ts')
  assert.equal(normalize('src/**/*.ts', 'win32'), 'src/**/*.ts')
  assert.equal(normalize('//server/share/src/**/*.ts', 'win32'), '//server/share/src/**/*.ts')
})
