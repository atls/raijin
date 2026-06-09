import type { ReleaseVersionChange }                from '../release-version-policy.utils.js'
import type { ReleaseVersionWorkspace }             from '../release-version-policy.utils.js'

import assert                                       from 'node:assert/strict'
import { test }                                     from 'node:test'

import { resolveReleaseVersionStrategy }            from '../release-version-policy.utils.js'
import { resolveReleaseVersionWorkspaceStrategies } from '../release-version-policy.utils.js'

const workspaces: Array<ReleaseVersionWorkspace> = [
  {
    ident: '@atls/code-runtime',
    relativeCwd: 'runtime/code-runtime',
  },
  {
    ident: '@atls/code-test',
    relativeCwd: 'code/code-test',
  },
]

test('should map feature commits to minor strategy', () => {
  assert.equal(resolveReleaseVersionStrategy('feat(runtime): add loader'), 'minor')
})

test('should map breaking commits to major strategy', () => {
  assert.equal(resolveReleaseVersionStrategy('fix(runtime)!: remove patched loader'), 'major')
  assert.equal(
    resolveReleaseVersionStrategy(
      'fix(runtime): remove patched loader\n\nBREAKING CHANGE: runtime changed'
    ),
    'major'
  )
})

test('should map release affecting conventional commits to patch strategy', () => {
  assert.equal(resolveReleaseVersionStrategy('fix(runtime): repair loader'), 'patch')
  assert.equal(resolveReleaseVersionStrategy('chore(runtime): update metadata'), 'patch')
})

test('should ignore non conventional commits', () => {
  assert.equal(resolveReleaseVersionStrategy('update runtime'), undefined)
})

test('should resolve strategies per changed workspace', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'feat(runtime): add loader',
      files: ['runtime/code-runtime/src/typescript.ts'],
    },
    {
      message: 'fix(test): repair runner',
      files: ['code/code-test/src/tester.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes), [
    {
      workspace: workspaces[1],
      strategy: 'patch',
    },
    {
      workspace: workspaces[0],
      strategy: 'minor',
    },
  ])
})

test('should keep highest strategy per workspace', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'fix(runtime): repair loader',
      files: ['runtime/code-runtime/src/typescript.ts'],
    },
    {
      message: 'feat(runtime): add loader',
      files: ['runtime/code-runtime/src/typescript.ts'],
    },
    {
      message: 'chore(runtime)!: remove legacy hook',
      files: ['runtime/code-runtime/src/typescript.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes), [
    {
      workspace: workspaces[0],
      strategy: 'major',
    },
  ])
})

test('should not match sibling workspace path prefixes', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'feat(test): add tester feature',
      files: ['code/code-test/src/tester.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes), [
    {
      workspace: workspaces[1],
      strategy: 'minor',
    },
  ])
})
