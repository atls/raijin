import type { Project }             from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { structUtils }              from '@yarnpkg/core'

import { getWorkspacePackageNames } from './workspace-package-names.js'

test('should read workspace package names from Yarn project workspaces', () => {
  const project = {
    workspaces: [
      { manifest: { name: structUtils.parseIdent('@internal/module') } },
      { manifest: { name: structUtils.parseIdent('service') } },
      { manifest: { name: null } },
    ],
  } as unknown as Pick<Project, 'workspaces'>

  assert.deepEqual(getWorkspacePackageNames(project), ['@internal/module', 'service'])
})
