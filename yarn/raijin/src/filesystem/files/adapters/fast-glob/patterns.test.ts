import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { translatePatterns } from './patterns.js'

test('should preserve relative glob semantics', () => {
  assert.deepEqual(translatePatterns(['src/**/*.{ts,tsx}']), ['src/**/*.ts', 'src/**/*.tsx'])
})

test('should preserve negated glob semantics', () => {
  assert.deepEqual(translatePatterns(['!src/**/*.test.ts']), ['!src/**/*.test.ts'])
})

test('should preserve absolute POSIX glob semantics', () => {
  assert.deepEqual(translatePatterns(['/repo/src/**/*.ts']), ['/repo/src/**/*.ts'])
})

test('should preserve explicit file and directory patterns', () => {
  assert.deepEqual(translatePatterns(['/repo/src/file.ts', 'src']), ['/repo/src/file.ts', 'src'])
})

test('should preserve extglob semantics', () => {
  assert.deepEqual(translatePatterns(['src/**/!(*.test).ts']), ['src/**/!(*.test).ts'])
})
