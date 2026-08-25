import type { ProjectProcessInvocation } from '@atls/raijin/commands'

import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { ChangedPathException }          from '../exceptions/path.js'
import { GitProcessException }           from '../exceptions/git-process.js'
import { normalizeProjectPath }          from '../path.js'
import { parseGitChangedFiles }           from '../git.js'
import { resolveGitChangedFiles }         from '../git.js'

test('parses rename and deletion status from Git name-status output', () => {
  assert.deepEqual(
    parseGitChangedFiles('R100\0src/old.ts\0src/new.ts\0D\0src/deleted.ts\0'),
    [
      {
        path: 'src/new.ts',
        previousPath: 'src/old.ts',
        status: 'renamed',
      },
      {
        path: 'src/deleted.ts',
        status: 'deleted',
      },
    ]
  )
})

test('normalizes project-relative paths and rejects boundary escapes as exceptions', () => {
  assert.equal(normalizeProjectPath('./packages/app/../app/src/index.ts'), 'packages/app/src/index.ts')
  assert.throws(
    () => normalizeProjectPath('../outside.ts'),
    (error: unknown) =>
      error instanceof ChangedPathException && error.cause === '../outside.ts'
  )
  assert.throws(() => normalizeProjectPath('/outside.ts'), ChangedPathException)
})

test('resolves tracked and untracked working tree files without another source', async () => {
  const calls: Array<ReadonlyArray<string>> = []
  const results = [
    { reason: 'completed', exitCode: 0, stdout: 'D\0src/deleted.ts\0', stderr: '' },
    { reason: 'completed', exitCode: 0, stdout: 'src/untracked.ts\0', stderr: '' },
  ]
  const processInvocation = {
    project: {
      execute: async (_command: string, args: ReadonlyArray<string>) => {
        calls.push(args)

        return results.shift()
      },
    },
  } as unknown as ProjectProcessInvocation

  assert.deepEqual(
    await resolveGitChangedFiles(processInvocation, { kind: 'working-tree' }),
    {
      kind: 'completed',
      files: [
        { path: 'src/deleted.ts', status: 'deleted' },
        { path: 'src/untracked.ts', status: 'added' },
      ],
    }
  )
  assert.deepEqual(calls, [
    ['diff', '--name-status', '-z', '--find-renames', '--end-of-options', 'HEAD', '--'],
    ['ls-files', '-z', '--others', '--exclude-standard'],
  ])
})

test('uses the exact push event range', async () => {
  const calls: Array<ReadonlyArray<string>> = []
  const processInvocation = {
    project: {
      execute: async (_command: string, args: ReadonlyArray<string>) => {
        calls.push(args)

        return { reason: 'completed', exitCode: 0, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectProcessInvocation

  assert.deepEqual(
    await resolveGitChangedFiles(processInvocation, {
      kind: 'push',
      base: 'before-sha',
      head: 'after-sha',
    }),
    { kind: 'completed', files: [] }
  )
  assert.deepEqual(calls, [
    [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      '--end-of-options',
      'before-sha..after-sha',
      '--',
    ],
  ])
})

test('keeps shallow history as a Git exception with the failed process result', async () => {
  const diffFailure = { reason: 'completed', exitCode: 128, stdout: '', stderr: 'bad object' }
  const results = [
    diffFailure,
    { reason: 'completed', exitCode: 0, stdout: 'HEAD\n', stderr: '' },
    { reason: 'completed', exitCode: 0, stdout: 'true\n', stderr: '' },
  ]
  const processInvocation = {
    project: {
      execute: async () => results.shift(),
    },
  } as unknown as ProjectProcessInvocation

  await assert.rejects(
    resolveGitChangedFiles(processInvocation, {
      kind: 'git-range',
      base: 'origin/main',
      head: 'HEAD',
    }),
    (error: unknown) =>
      error instanceof GitProcessException &&
      error.operation === 'resolve-shallow-history' &&
      error.cause === diffFailure
  )
})

test('returns an unresolvable explicit range as a managed comparison error', async () => {
  const calls: Array<ReadonlyArray<string>> = []
  const processInvocation = {
    project: {
      execute: async (_command: string, args: ReadonlyArray<string>) => {
        calls.push(args)

        if (args[0] === 'rev-parse' && args[1] === '--is-shallow-repository') {
          return { reason: 'completed', exitCode: 0, stdout: 'false\n', stderr: '' }
        }

        return { reason: 'completed', exitCode: 1, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectProcessInvocation

  assert.deepEqual(
    await resolveGitChangedFiles(processInvocation, {
      kind: 'git-range',
      base: 'missing-ref',
      head: 'HEAD',
    }),
    { kind: 'error', reason: 'invalid-comparison', source: 'git-range' }
  )
  assert.equal(calls.some(([operation]) => operation === 'diff'), false)
})

test('preserves explicit range validation process noncompletion as an exception', async () => {
  const cause = new Error('process start failed')
  const processInvocation = {
    project: {
      execute: async () => ({ reason: 'start-failed', cause, stdout: '', stderr: '' }),
    },
  } as unknown as ProjectProcessInvocation

  await assert.rejects(
    resolveGitChangedFiles(processInvocation, {
      kind: 'git-range',
      base: 'origin/main',
      head: 'HEAD',
    }),
    (error: unknown) =>
      error instanceof GitProcessException &&
      error.operation === 'validate-comparison' &&
      error.cause === cause
  )
})

test('preserves the cause of Git process noncompletion', async () => {
  const cause = new Error('process start failed')
  const processInvocation = {
    project: {
      execute: async () => ({ reason: 'start-failed', cause, stdout: '', stderr: '' }),
    },
  } as unknown as ProjectProcessInvocation

  await assert.rejects(
    resolveGitChangedFiles(processInvocation, { kind: 'working-tree' }),
    (error: unknown) => error instanceof GitProcessException && error.cause === cause
  )
})
