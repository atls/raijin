import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { getTSConfigIncludeEntries } from './tools-sync-tsconfig.command.js'

test('should create include entries when tsconfig include is missing', () => {
  assert.deepEqual(getTSConfigIncludeEntries(undefined, []), ['project.types.d.ts'])
})

test('should preserve existing include entries and workspace includes', () => {
  assert.deepEqual(getTSConfigIncludeEntries(['src/**/*'], ['packages/**/*']), [
    'project.types.d.ts',
    'src/**/*',
    'packages/**/*',
  ])
})
