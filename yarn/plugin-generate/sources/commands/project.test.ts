import type { ProjectInvocation }         from '@atls/raijin/commands'

import assert                             from 'node:assert/strict'
import { test }                           from 'node:test'

import { createProjectScaffolderOptions } from './project.js'

test('should preserve the nested invocation cwd as the generation target', () => {
  const configuration = { source: 'configuration' }
  const workspace = { source: 'workspace' }
  const project = {
    getWorkspaceByFilePath: (cwd: string) => {
      assert.equal(cwd, '/repo/packages/client/app')

      return workspace
    },
    source: 'project',
  }
  const invocation = {
    invocationCwd: '/repo/packages/client/app',
    yarn: { configuration, project },
  } as unknown as ProjectInvocation

  assert.deepEqual(createProjectScaffolderOptions(invocation), {
    configuration,
    project,
    targetCwd: '/repo/packages/client/app',
    workspace,
  })
})
