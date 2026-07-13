import type { PortablePath }  from '@yarnpkg/fslib'

import assert                 from 'node:assert/strict'
import { test }               from 'node:test'

import { createCommandInput } from '../target.js'
import { toCommandArguments } from './cli.js'

test('should serialize normalized targets for a child command cwd', () => {
  const input = createCommandInput({
    cwd: '/repo/packages/app' as PortablePath,
    source: 'explicit',
    targets: ['src/index.ts', '/repo/shared/index.ts'],
  })

  assert.deepEqual(toCommandArguments(input, '/repo' as PortablePath), [
    'packages/app/src/index.ts',
    'shared/index.ts',
  ])
})
