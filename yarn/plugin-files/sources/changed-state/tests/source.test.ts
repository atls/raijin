import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { selectChangedStateSource } from '../select-source.js'

test('selects an explicit Git range before any GitHub event source', () => {
  assert.deepEqual(selectChangedStateSource('origin/main', { name: 'schedule' }), {
    kind: 'selected',
    source: {
      kind: 'git-range',
      base: 'origin/main',
      head: 'HEAD',
    },
  })
})

test('selects the local working tree when no external event is present', () => {
  assert.deepEqual(selectChangedStateSource(), {
    kind: 'selected',
    source: { kind: 'working-tree' },
  })
})

test('selects exact pull request context without credential data', () => {
  const result = selectChangedStateSource(undefined, {
    name: 'pull_request',
    repository: { owner: 'atls', repo: 'raijin' },
    pullRequest: { base: 'base-sha', head: 'head-sha', number: 912 },
  })

  assert.deepEqual(result, {
    kind: 'selected',
    source: {
      kind: 'pull-request',
      owner: 'atls',
      repo: 'raijin',
      number: 912,
      base: 'base-sha',
      head: 'head-sha',
    },
  })
  assert.equal(result.kind === 'selected' && 'token' in result.source, false)
})

test('selects the exact push event comparison', () => {
  assert.deepEqual(
    selectChangedStateSource(undefined, {
      name: 'push',
      push: { before: 'before-sha', after: 'after-sha' },
    }),
    {
      kind: 'selected',
      source: {
        kind: 'push',
        base: 'before-sha',
        head: 'after-sha',
      },
    }
  )
})

test('returns typed managed errors for controlled input constraints', () => {
  assert.deepEqual(selectChangedStateSource(undefined, { name: 'workflow_dispatch' }), {
    kind: 'error',
    reason: 'unsupported-event',
    eventName: 'workflow_dispatch',
  })
  assert.deepEqual(selectChangedStateSource(undefined, { name: 'pull_request' }), {
    kind: 'error',
    reason: 'incomplete-event',
    eventName: 'pull_request',
  })
  assert.deepEqual(
    selectChangedStateSource(undefined, {
      name: 'push',
      push: { before: '0000000000', after: 'head-sha' },
    }),
    { kind: 'error', reason: 'invalid-comparison', source: 'push' }
  )
  assert.deepEqual(selectChangedStateSource('  '), {
    kind: 'error',
    reason: 'invalid-comparison',
    source: 'git-range',
  })
})
