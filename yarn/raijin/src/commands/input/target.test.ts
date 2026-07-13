import type { PortablePath }  from '@yarnpkg/fslib'

import assert                 from 'node:assert/strict'
import { test }               from 'node:test'

import { createCommandInput } from './target.js'

test('should normalize explicit targets against the invocation cwd', () => {
  assert.deepEqual(
    createCommandInput({
      cwd: '/repo/packages/app' as PortablePath,
      source: 'explicit',
      targets: ['src/index.ts', '/repo/shared/index.ts', 'src/index.ts'],
    }),
    {
      cwd: '/repo/packages/app',
      source: 'explicit',
      targets: [
        {
          path: '/repo/packages/app/src/index.ts',
          request: 'src/index.ts',
        },
        {
          path: '/repo/shared/index.ts',
          request: '/repo/shared/index.ts',
        },
      ],
    }
  )
})

test('should represent generated and changed targets in memory', () => {
  assert.deepEqual(
    ['generated', 'changed'].map((source) =>
      createCommandInput({
        cwd: '/repo' as PortablePath,
        source: source as 'changed' | 'generated',
        targets: ['packages/app/src/**/*.ts'],
      })),
    [
      {
        cwd: '/repo',
        source: 'generated',
        targets: [
          {
            path: '/repo/packages/app/src/**/*.ts',
            request: 'packages/app/src/**/*.ts',
          },
        ],
      },
      {
        cwd: '/repo',
        source: 'changed',
        targets: [
          {
            path: '/repo/packages/app/src/**/*.ts',
            request: 'packages/app/src/**/*.ts',
          },
        ],
      },
    ]
  )
})
