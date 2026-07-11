import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { resolveProjectType } from './type.js'

test('should resolve single project type without workspace patterns', () => {
  assert.equal(
    resolveProjectType({
      topLevelWorkspace: {
        cwd: '/repo',
        manifest: { workspaceDefinitions: [] },
      },
      workspaces: [],
    }),
    'single'
  )
})

test('should resolve monorepo project type with workspace patterns', () => {
  assert.equal(
    resolveProjectType({
      topLevelWorkspace: {
        cwd: '/repo',
        manifest: { workspaceDefinitions: [{ pattern: 'packages/*' }] },
      },
      workspaces: [],
    }),
    'monorepo'
  )
})
