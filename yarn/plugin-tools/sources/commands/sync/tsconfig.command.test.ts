import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { getTSConfigIncludeEntries } from './tsconfig.command.js'

test('should preserve implicit include when tsconfig include is missing', () => {
  assert.deepEqual(getTSConfigIncludeEntries({}, []), ['project.types.d.ts', '**/*'])
})

test('should preserve existing include entries and workspace includes', () => {
  assert.deepEqual(getTSConfigIncludeEntries({ include: ['src/**/*'] }, ['packages/**/*']), [
    'project.types.d.ts',
    'src/**/*',
    'packages/**/*',
  ])
})

test('should not create include for file-only tsconfig', () => {
  assert.equal(getTSConfigIncludeEntries({ files: ['src/index.ts'] }, []), undefined)
})

test('should not create include for solution tsconfig with empty files', () => {
  assert.equal(getTSConfigIncludeEntries({ files: [] }, []), undefined)
})

test('should not create include when tsconfig inherits scope from extends', () => {
  assert.equal(getTSConfigIncludeEntries({ extends: './tsconfig.base.json' }, []), undefined)
})
