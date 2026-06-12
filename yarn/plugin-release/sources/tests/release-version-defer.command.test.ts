import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { structUtils }                   from '@yarnpkg/core'

import { isReleaseVersionWorkspace }     from '../release-version-defer.command.js'
import { parseDeferredReleaseDecisions } from '../release-version-defer.command.js'
import { selectLocalCommitDiffParent }   from '../release-version-defer.command.js'
import { toGitHubChange }                from '../release-version-defer.command.js'

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

test('should diff merge commits against the parent outside the local range', () => {
  assert.equal(
    selectLocalCommitDiffParent(['feature-parent', 'base-parent'], new Set(['feature-parent'])),
    'base-parent'
  )
})

test('should fall back to the first parent when all merge parents are local', () => {
  assert.equal(
    selectLocalCommitDiffParent(
      ['feature-parent', 'topic-parent'],
      new Set(['feature-parent', 'topic-parent'])
    ),
    'feature-parent'
  )
})

test('should preserve declined deferred decisions', () => {
  const decisions = parseDeferredReleaseDecisions(
    [
      'declined:',
      '  - "@atls/code-runtime"',
      'releases:',
      '  "@atls/code-runtime": minor',
      '  "@atls/code-test": patch',
    ].join('\n')
  )

  assert.equal(decisions.get('@atls/code-runtime'), 'decline')
  assert.equal(decisions.get('@atls/code-test'), 'patch')
})

test('should include private versioned workspaces in release version policy', () => {
  assert.equal(
    isReleaseVersionWorkspace({
      relativeCwd: 'yarn/plugin-renderer',
      manifest: {
        name: structUtils.makeIdent('atls', 'yarn-plugin-renderer'),
        version: '1.0.7',
        raw: {
          private: true,
        },
      },
    }),
    true
  )
})

test('should exclude root workspace from release version policy', () => {
  assert.equal(
    isReleaseVersionWorkspace({
      relativeCwd: '.',
      manifest: {
        name: structUtils.makeIdent(null, 'tools'),
        version: '1.0.0',
        raw: {
          private: true,
        },
      },
    }),
    false
  )
})

test('should exclude unversioned workspaces from release version policy', () => {
  assert.equal(
    isReleaseVersionWorkspace({
      relativeCwd: 'yarn/cli-tools',
      manifest: {
        name: structUtils.makeIdent('atls', 'yarn-cli-tools'),
        version: null,
        raw: {
          private: true,
        },
      },
    }),
    false
  )
})
