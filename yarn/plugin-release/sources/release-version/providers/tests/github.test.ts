import assert                               from 'node:assert/strict'
import { readFile }                         from 'node:fs/promises'
import { test }                             from 'node:test'

import { normalizeGitHubCommitPages }       from '../github.js'

test('owns the GitHub commit provider dependency in plugin-release', async () => {
  const manifest = JSON.parse(
    await readFile(new URL('../../../../package.json', import.meta.url), 'utf-8')
  ) as { dependencies?: Record<string, string> }

  assert.ok(manifest.dependencies)
  assert.equal(manifest.dependencies['@actions/github'], '6.0.0')
  assert.equal(manifest.dependencies['@atls/yarn-plugin-files'], undefined)
})

test('normalizes paginated commit changes including previous filenames', () => {
  const change = normalizeGitHubCommitPages([
    {
      commit: { message: 'fix(runtime): move loader' },
      files: [
        {
          filename: 'code/code-test/src/loader.ts',
          previous_filename: 'yarn/raijin/src/loader.ts',
        },
      ],
    },
    {
      commit: { message: 'fix(runtime): move loader' },
      files: [{ filename: 'code/code-test/src/index.ts' }],
    },
  ])

  assert.deepEqual(change, {
    message: 'fix(runtime): move loader',
    files: [
      'code/code-test/src/loader.ts',
      'yarn/raijin/src/loader.ts',
      'code/code-test/src/index.ts',
    ],
  })
})

test('rejects malformed commit payload within the release provider boundary', () => {
  assert.throws(
    () => normalizeGitHubCommitPages([{ commit: {}, files: [] }]),
    (error: unknown) =>
      error instanceof Error && error.message === 'GitHub commit message payload is invalid'
  )
})
