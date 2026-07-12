import assert                           from 'node:assert/strict'
import test                             from 'node:test'

import { createGenerateProjectOptions } from './generate-project.command.js'

test('should generate from the original nested invocation cwd', () => {
  assert.deepEqual(createGenerateProjectOptions('project', '/repo/client/app'), {
    type: 'project',
    cwd: '/repo/client/app',
  })
})
