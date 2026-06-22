import type { ReleaseVersionChange }                from '../release-version-policy.utils.js'
import type { ReleaseVersionWorkspace }             from '../release-version-policy.utils.js'

import assert                                       from 'node:assert/strict'
import { test }                                     from 'node:test'

import { mergeReleaseVersionDeferredDecision }      from '../release-version-policy.utils.js'
import { resolveReleaseVersionDeferredStrategy }    from '../release-version-policy.utils.js'
import { resolveReleaseVersionStrategy }            from '../release-version-policy.utils.js'
import { resolveReleaseVersionWorkspaceStrategies } from '../release-version-policy.utils.js'

const rootWorkspace: ReleaseVersionWorkspace = {
  ident: 'tools',
  relativeCwd: '.',
}

const runtimeWorkspace: ReleaseVersionWorkspace = {
  ident: '@atls/raijin',
  relativeCwd: 'yarn/raijin',
}

const testWorkspace: ReleaseVersionWorkspace = {
  ident: '@atls/code-test',
  relativeCwd: 'code/code-test',
}

const privateWorkspace = {
  relativeCwd: 'examples/private-service',
}

const privateRuntimeWorkspace = {
  relativeCwd: 'yarn/raijin/examples/private-service',
}

const workspaces: Array<ReleaseVersionWorkspace> = [rootWorkspace, runtimeWorkspace, testWorkspace]
const workspaceOwners = [...workspaces, privateWorkspace, privateRuntimeWorkspace]

test('should map feature commits to minor strategy', () => {
  assert.equal(resolveReleaseVersionStrategy('feat(runtime): add loader'), 'minor')
})

test('should preserve explicit deferred decisions over computed strategies', () => {
  assert.equal(resolveReleaseVersionDeferredStrategy('major', 'patch'), 'major')
  assert.equal(resolveReleaseVersionDeferredStrategy('2.0.0', 'patch'), '2.0.0')
  assert.equal(resolveReleaseVersionDeferredStrategy('decline', 'patch'), 'decline')
})

test('should merge deferred decisions by preserving explicit decisions and highest strategy', () => {
  assert.equal(mergeReleaseVersionDeferredDecision('patch', 'minor'), 'minor')
  assert.equal(mergeReleaseVersionDeferredDecision('major', 'patch'), 'major')
  assert.equal(mergeReleaseVersionDeferredDecision('patch', '2.0.0'), '2.0.0')
  assert.equal(mergeReleaseVersionDeferredDecision('decline', 'patch'), 'decline')
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

test('should map breaking footer after body to major strategy', () => {
  assert.equal(
    resolveReleaseVersionStrategy(
      [
        'fix(runtime): remove patched loader',
        '',
        'The loader no longer accepts legacy hooks.',
        '',
        'BREAKING CHANGE: runtime changed',
      ].join('\n')
    ),
    'major'
  )
})

test('should map multiline breaking footer to major strategy', () => {
  assert.equal(
    resolveReleaseVersionStrategy(
      [
        'fix(runtime): remove patched loader',
        '',
        'BREAKING CHANGE: runtime changed',
        'Follow the migration guide before upgrading.',
      ].join('\n')
    ),
    'major'
  )
})

test('should ignore breaking change markers outside footer block', () => {
  assert.equal(
    resolveReleaseVersionStrategy(
      [
        'fix(runtime): repair loader',
        '',
        'The generated docs include this example:',
        'BREAKING CHANGE: not a footer',
      ].join('\n')
    ),
    'patch'
  )
  assert.equal(
    resolveReleaseVersionStrategy(
      ['fix(runtime): repair loader', '', '```text', 'BREAKING CHANGE: not a footer', '```'].join(
        '\n'
      )
    ),
    'patch'
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
      files: ['yarn/raijin/src/typescript.ts'],
    },
    {
      message: 'fix(test): repair runner',
      files: ['code/code-test/src/tester.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes), [
    {
      workspace: testWorkspace,
      strategy: 'patch',
    },
    {
      workspace: runtimeWorkspace,
      strategy: 'minor',
    },
  ])
})

test('should keep highest strategy per workspace', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'fix(runtime): repair loader',
      files: ['yarn/raijin/src/typescript.ts'],
    },
    {
      message: 'feat(runtime): add loader',
      files: ['yarn/raijin/src/typescript.ts'],
    },
    {
      message: 'chore(runtime)!: remove legacy hook',
      files: ['yarn/raijin/src/typescript.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes), [
    {
      workspace: runtimeWorkspace,
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
      workspace: testWorkspace,
      strategy: 'minor',
    },
  ])
})

test('should resolve root workspace files not claimed by nested workspaces', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'fix(root): update release policy',
      files: ['package.json', 'yarn/raijin/src/typescript.ts'],
    },
  ]

  assert.deepEqual(resolveReleaseVersionWorkspaceStrategies(workspaces, changes, workspaceOwners), [
    {
      workspace: rootWorkspace,
      strategy: 'patch',
    },
    {
      workspace: runtimeWorkspace,
      strategy: 'patch',
    },
  ])
})

test('should not resolve private child workspace files as root workspace changes', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'fix(private): update internal service',
      files: ['examples/private-service/src/service.ts'],
    },
  ]

  assert.deepEqual(
    resolveReleaseVersionWorkspaceStrategies(workspaces, changes, workspaceOwners),
    []
  )
})

test('should not resolve nested private workspace files as parent workspace changes', () => {
  const changes: Array<ReleaseVersionChange> = [
    {
      message: 'fix(runtime): update example service',
      files: ['yarn/raijin/examples/private-service/src/service.ts'],
    },
  ]

  assert.deepEqual(
    resolveReleaseVersionWorkspaceStrategies(workspaces, changes, workspaceOwners),
    []
  )
})
