import type { Project }             from '@yarnpkg/core'
import type { Workspace }           from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { Manifest }                 from '@yarnpkg/core'

import { getWorkspacePackageNames } from './package-names.js'

const createWorkspace = (name?: string): Workspace =>
  ({
    manifest: Manifest.fromText(JSON.stringify(name ? { name } : {})),
  }) as Workspace

test('should read sorted package names from Yarn project workspaces', () => {
  const project = {
    workspaces: [
      createWorkspace('@scope/zeta'),
      createWorkspace(),
      createWorkspace('unscoped'),
      createWorkspace('@scope/alpha'),
    ],
  } as Project

  assert.deepEqual(getWorkspacePackageNames(project), ['@scope/alpha', '@scope/zeta'])
})
