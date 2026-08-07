import type { PortablePath } from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { createTestInput }   from './abstract-test.command.jsx'

test('should default test discovery to the invocation cwd', () => {
  assert.deepEqual(
    createTestInput({ files: [], invocationCwd: '/repo/packages/client' as PortablePath }),
    {
      cwd: '/repo/packages/client',
      source: 'explicit',
      targets: [],
    }
  )
})

test('should resolve explicit test files from the invocation cwd', () => {
  assert.deepEqual(
    createTestInput({
      files: ['src/client.test.ts'],
      invocationCwd: '/repo/packages/client' as PortablePath,
    }),
    {
      cwd: '/repo/packages/client',
      source: 'explicit',
      targets: [
        {
          path: '/repo/packages/client/src/client.test.ts',
          request: 'src/client.test.ts',
        },
      ],
    }
  )
})

test('should use an explicit test target as the discovery cwd', () => {
  assert.equal(
    createTestInput({
      files: [],
      invocationCwd: '/repo/packages/client/src' as PortablePath,
      target: '..',
    }).cwd,
    '/repo/packages/client'
  )
})
