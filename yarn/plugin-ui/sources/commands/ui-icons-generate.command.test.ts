import type { PortablePath }        from '@yarnpkg/fslib'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { toCommandArguments }       from '@atls/raijin/commands'

import { createGeneratedIconInput } from './ui-icons-generate.command.js'

test('should represent generated icon targets from workspace cwd', () => {
  const projectCwd = '/tmp/raijin-project' as PortablePath
  const workspaceCwd = '/tmp/raijin-project/packages/ui' as PortablePath
  const input = createGeneratedIconInput(workspaceCwd, ['Icon.tsx'])

  assert.equal(input.source, 'generated')
  assert.deepEqual(toCommandArguments(input, projectCwd), ['packages/ui/src/Icon.tsx'])
})
