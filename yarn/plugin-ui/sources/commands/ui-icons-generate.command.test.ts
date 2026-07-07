import assert                         from 'node:assert/strict'
import { isAbsolute }                 from 'node:path'
import { join }                       from 'node:path'
import { test }                       from 'node:test'

import { createGeneratedIconTargets } from './ui-icons-generate.command.js'

test('should create absolute generated icon targets from workspace cwd', () => {
  const projectCwd = join('/', 'tmp', 'raijin-project')
  const workspaceCwd = join(projectCwd, 'packages', 'ui')
  const nestedInvocationCwd = join(workspaceCwd, 'src', 'components')
  const targets = createGeneratedIconTargets(workspaceCwd, ['Icon.tsx'])

  assert.deepEqual(targets, [join(workspaceCwd, 'src', 'Icon.tsx')])
  assert.equal(isAbsolute(targets[0]), true)
  assert.notEqual(targets[0], join(nestedInvocationCwd, 'packages', 'ui', 'src', 'Icon.tsx'))
})
