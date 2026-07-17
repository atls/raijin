import type { PortablePath }    from '@yarnpkg/fslib'

import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { createCommandInput }   from '@atls/raijin/commands/input'

import { resolveProjectTarget } from './workflow.js'

test('should resolve project generation target from nested invocation cwd', () => {
  const input = createCommandInput({
    cwd: '/repo/packages/client' as PortablePath,
    source: 'explicit',
    targets: ['.'],
  })

  assert.equal(resolveProjectTarget(input), '/repo/packages/client')
})
