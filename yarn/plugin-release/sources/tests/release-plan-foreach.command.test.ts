import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { RELEASE_OWNERSHIP_CONTRACT }    from '../release-ownership.contract.js'
import { RELEASE_PLAN_SCHEMA_VERSION }   from '../release-ownership.contract.js'
import { createReleasePlanForeachInput } from '../release-plan-foreach.command.js'

test('should run native foreach over release plan workspaces', () => {
  const input = createReleasePlanForeachInput(
    {
      schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
      ownership: RELEASE_OWNERSHIP_CONTRACT,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          decision: 'release',
          private: true,
        },
        {
          ident: '@atls/yarn-plugin-release',
          relativeCwd: 'yarn/plugin-release',
          decision: 'release',
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
        schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
        ownership: RELEASE_OWNERSHIP_CONTRACT,
        workspaces: [],
      },
      {}
    ),
    []
  )
})

test('should skip declined release plan workspaces', () => {
  const input = createReleasePlanForeachInput(
    {
      schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
      ownership: RELEASE_OWNERSHIP_CONTRACT,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          decision: 'decline',
          private: true,
        },
        {
          ident: '@atls/yarn-plugin-release',
          relativeCwd: 'yarn/plugin-release',
          decision: 'release',
          private: true,
        },
      ],
    },
    {}
  )

  assert.deepEqual(input, [
    'workspaces',
    'foreach',
    '--include',
    '@atls/yarn-plugin-release',
    '--all',
  ])
})

test('should not run native foreach when all plan workspaces are declined', () => {
  assert.deepEqual(
    createReleasePlanForeachInput(
      {
        schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
        ownership: RELEASE_OWNERSHIP_CONTRACT,
        workspaces: [
          {
            ident: '@atls/yarn-cli',
            relativeCwd: 'yarn/cli',
            decision: 'decline',
            private: true,
          },
        ],
      },
      {}
    ),
    []
  )
})
