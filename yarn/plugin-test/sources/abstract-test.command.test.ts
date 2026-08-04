import assert              from 'node:assert/strict'
import { test }            from 'node:test'

import { createTestArgs }  from './abstract-test.command.jsx'
import { createTestInput } from './abstract-test.command.jsx'

test('should keep test file targets as separate arguments', () => {
  assert.deepEqual(
    createTestArgs({
      files: ['/repo/src/a.test.ts', '/repo/src/b.test.ts'],
      watch: true,
      target: '/repo',
      testReporter: 'tap',
      testNamePattern: 'selected test',
    }),
    [
      '/repo/src/a.test.ts',
      '/repo/src/b.test.ts',
      '-w',
      '-t',
      '/repo',
      '--test-reporter=tap',
      '--test-name-pattern=selected test',
    ]
  )
})

test('should default test discovery to the invocation cwd', () => {
  assert.deepEqual(
    createTestInput({ files: [], invocationCwd: '/repo/packages/client' as never }),
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
      invocationCwd: '/repo/packages/client' as never,
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
      invocationCwd: '/repo/packages/client/src' as never,
      target: '..',
    }).cwd,
    '/repo/packages/client'
  )
})
