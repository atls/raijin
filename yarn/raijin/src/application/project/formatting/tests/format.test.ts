import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import { formatSources } from '../format.js'

test('should report changed and unchanged sources without rewriting unchanged files', async () => {
  const written: Array<{ content: string; path: string }> = []
  const sources = new Map([
    ['/repo/changed.ts', 'const changed={value:1}\n'],
    ['/repo/unchanged.ts', 'const unchanged = { value: 1 }\n'],
  ])

  const result = await formatSources(
    {},
    {
      files: {
        read: async (path) => sources.get(path) ?? '',
        resolve: async () => [
          { file: 'changed.ts', path: '/repo/changed.ts' },
          { file: 'unchanged.ts', path: '/repo/unchanged.ts' },
        ],
        write: async (path, content) => {
          written.push({ content, path })
        },
      },
      formatter: {
        format: async (_target, source) => source.replace('changed={', 'changed = {'),
      },
    }
  )

  assert.deepEqual(result, {
    files: [
      { file: 'changed.ts', status: 'changed' },
      { file: 'unchanged.ts', status: 'unchanged' },
    ],
  })
  assert.deepEqual(written, [{ content: 'const changed = {value:1}\n', path: '/repo/changed.ts' }])
})

test('should preserve provider failures', async () => {
  const failure = new Error('formatter unavailable')
  const calls: Array<string> = []

  await assert.rejects(
    formatSources(
      {},
      {
        files: {
          read: async (path) => {
            calls.push(`read:${path}`)

            return 'const value=1\n'
          },
          resolve: async () => [
            { file: 'first.ts', path: '/repo/first.ts' },
            { file: 'second.ts', path: '/repo/second.ts' },
          ],
          write: async () => undefined,
        },
        formatter: {
          format: async (target) => {
            calls.push(`format:${target.path}`)
            throw failure
          },
        },
      }
    ),
    (error) => error === failure
  )
  assert.deepEqual(calls, ['read:/repo/first.ts', 'format:/repo/first.ts'])
})
