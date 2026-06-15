import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { createReleasePlanForeachInput } from '../release-plan-foreach.command.js'

test('should run native foreach over release plan workspaces', () => {
  const input = createReleasePlanForeachInput(
    {
      schemaVersion: 1,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          version: '1.1.96',
          strategy: 'patch',
          private: true,
        },
        {
          ident: '@atls/yarn-plugin-release',
          relativeCwd: 'yarn/plugin-release',
          version: '1.0.10',
          strategy: 'minor',
          private: true,
        },
      ],
    },
    {
      exclude: '.',
      verbose: true,
      topological: true,
      publicOnly: true,
    }
  )

  assert.deepEqual(input, [
    'workspaces',
    'foreach',
    '--include',
    '@atls/yarn-cli',
    '--include',
    '@atls/yarn-plugin-release',
    '--all',
    '--exclude',
    '.',
    '--verbose',
    '--no-private',
    '--topological',
  ])
})

test('should not run native foreach for empty release plan', () => {
  assert.deepEqual(
    createReleasePlanForeachInput(
      {
        schemaVersion: 1,
        workspaces: [],
      },
      {}
    ),
    []
  )
})
