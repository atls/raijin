import assert             from 'node:assert/strict'
import { test }           from 'node:test'

import { toGitHubChange } from '../release-version-defer.command.js'

test('should include previous GitHub filenames for renamed files', () => {
  const change = toGitHubChange({
    data: {
      commit: {
        message: 'fix(runtime): move loader',
      },
      files: [
        {
          filename: 'code/code-test/src/loader.ts',
          previous_filename: 'runtime/code-runtime/src/loader.ts',
        },
      ],
    },
  } as Parameters<typeof toGitHubChange>[0])

  assert.deepEqual(change, {
    message: 'fix(runtime): move loader',
    files: ['code/code-test/src/loader.ts', 'runtime/code-runtime/src/loader.ts'],
  })
})
