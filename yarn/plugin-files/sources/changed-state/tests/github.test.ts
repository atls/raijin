import type { PullRequestFilesProvider } from '../interfaces/provider.js'
import type { ChangedStateSource }        from '../interfaces/source.js'

import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { createPullRequestFilesProvider } from '../github.js'
import { PullRequestPayloadException }   from '../exceptions/pull-request-payload.js'
import { PullRequestProviderException }  from '../exceptions/pull-request-provider.js'
import { resolvePullRequestChangedFiles } from '../github.js'

const source: Extract<ChangedStateSource, { readonly kind: 'pull-request' }> = {
  kind: 'pull-request',
  owner: 'atls',
  repo: 'raijin',
  number: 852,
  base: 'base-sha',
  head: 'head-sha',
}

const createProvider = (
  overrides: Partial<PullRequestFilesProvider> = {}
): PullRequestFilesProvider => ({
  readMetadata: async () => ({ base: source.base, changedFiles: 0, head: source.head }),
  listFiles: async () => [],
  ...overrides,
})

test('keeps missing credential as a managed provider-boundary result', () => {
  assert.deepEqual(createPullRequestFilesProvider(source, {}), {
    kind: 'error',
    reason: 'missing-token',
  })
})

test('normalizes GitHub files without leaking provider payloads', async () => {
  const result = await resolvePullRequestChangedFiles(
    source,
    createProvider({
      readMetadata: async () => ({
        base: source.base,
        changedFiles: 2,
        head: source.head,
      }),
      listFiles: async () => [
        {
          filename: 'src/new.ts',
          previous_filename: 'src/old.ts',
          status: 'renamed',
          patch: 'provider-only-data',
        },
        {
          filename: 'src/deleted.ts',
          status: 'removed',
        },
      ],
    })
  )

  assert.deepEqual(result, {
    kind: 'completed',
    files: [
      {
        path: 'src/new.ts',
        previousPath: 'src/old.ts',
        status: 'renamed',
      },
      {
        path: 'src/deleted.ts',
        status: 'deleted',
      },
    ],
  })
})

test('returns stale pull request snapshots as managed errors', async () => {
  assert.deepEqual(
    await resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => ({
          base: source.base,
          changedFiles: 0,
          head: 'new-head',
        }),
      })
    ),
    { kind: 'error', reason: 'stale-pull-request' }
  )
})

test('rejects a pull request that moves while files are being paginated', async () => {
  let metadataReads = 0

  assert.deepEqual(
    await resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => {
          metadataReads += 1

          return {
            base: source.base,
            changedFiles: 0,
            head: metadataReads === 1 ? source.head : 'new-head',
          }
        },
      })
    ),
    { kind: 'error', reason: 'stale-pull-request' }
  )
})

test('returns a managed error when GitHub cannot prove the selected file list is complete', async () => {
  const files = Array.from({ length: 3000 }, (_, index) => ({
    filename: `src/file-${index}.ts`,
    status: 'modified',
  }))

  assert.deepEqual(
    await resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => ({
          base: source.base,
          changedFiles: 3001,
          head: source.head,
        }),
        listFiles: async () => files,
      })
    ),
    {
      kind: 'error',
      reason: 'incomplete-pull-request-files',
      expected: 3001,
      received: 3000,
      limit: 3000,
    }
  )
})

test('returns a managed error when the returned file count is incomplete below the limit', async () => {
  assert.deepEqual(
    await resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => ({
          base: source.base,
          changedFiles: 1,
          head: source.head,
        }),
      })
    ),
    {
      kind: 'error',
      reason: 'incomplete-pull-request-files',
      expected: 1,
      received: 0,
      limit: 3000,
    }
  )
})

test('preserves provider and pagination exceptions with operation context', async () => {
  const metadataCause = new Error('metadata provider failed')
  const paginationCause = new Error('pagination failed')

  await assert.rejects(
    resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => {
          throw metadataCause
        },
      })
    ),
    (error: unknown) =>
      error instanceof PullRequestProviderException &&
      error.operation === 'read-metadata' &&
      error.cause === metadataCause
  )

  await assert.rejects(
    resolvePullRequestChangedFiles(
      source,
      createProvider({
        listFiles: async () => {
          throw paginationCause
        },
      })
    ),
    (error: unknown) =>
      error instanceof PullRequestProviderException &&
      error.operation === 'list-files' &&
      error.cause === paginationCause
  )
})

test('keeps invalid provider payload as an exception with payload context', async () => {
  const payload = { filename: 'src/new.ts', status: 'unknown-status' }

  await assert.rejects(
    resolvePullRequestChangedFiles(
      source,
      createProvider({
        readMetadata: async () => ({
          base: source.base,
          changedFiles: 1,
          head: source.head,
        }),
        listFiles: async () => [payload],
      })
    ),
    (error: unknown) =>
      error instanceof PullRequestPayloadException &&
      error.operation === 'files' &&
      error.payload === payload &&
      error.cause === payload
  )
})
