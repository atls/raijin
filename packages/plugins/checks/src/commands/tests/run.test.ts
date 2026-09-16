import type { Project }             from '@yarnpkg/core'
import type { Workspace }           from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { structUtils }              from '@yarnpkg/core'

import { selectAffectedWorkspaces } from '../run.js'

const workspace = (name: string, dependents: () => Set<Workspace> = () => new Set()): Workspace =>
  ({
    anchoredLocator: structUtils.makeLocator(
      structUtils.makeIdent(null, name),
      `workspace:packages/${name}`
    ),
    getRecursiveWorkspaceDependents: dependents,
  }) as unknown as Workspace

test('a root-level change selects one full-project verification', () => {
  const root = workspace('root')
  const alpha = workspace('alpha')
  const project = { topLevelWorkspace: root, workspaces: [root, alpha] } as Project

  assert.deepEqual(selectAffectedWorkspaces(project, new Set([root, alpha])), [root])
})

test('a package change includes Yarn-reported recursive dependents once', () => {
  const root = workspace('root')
  const beta = workspace('beta')
  const gamma = workspace('gamma')
  const alpha = workspace('alpha', () => new Set([beta, gamma]))
  const project = { topLevelWorkspace: root, workspaces: [root, alpha, beta, gamma] } as Project

  assert.deepEqual(selectAffectedWorkspaces(project, new Set([alpha, beta])), [alpha, beta, gamma])
})
