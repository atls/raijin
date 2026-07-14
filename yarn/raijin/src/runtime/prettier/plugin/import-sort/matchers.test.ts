import type { IImport }                 from 'import-sort-parser'

import assert                           from 'node:assert/strict'
import test                             from 'node:test'

import { createWorkspaceModuleMatcher } from './matchers.js'

test('should classify package names supplied by the Yarn project as workspaces', () => {
  const isWorkspaceModule = createWorkspaceModuleMatcher(['@atls/raijin'])

  assert.equal(isWorkspaceModule({ moduleName: '@atls/raijin/commands' } as IImport), true)
  assert.equal(isWorkspaceModule({ moduleName: '@atls/raijin-extra' } as IImport), false)
  assert.equal(isWorkspaceModule({ moduleName: '@yarnpkg/core' } as IImport), false)
})
