import type { Project }             from '@yarnpkg/core'
import type { Workspace }           from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { Filename }                 from '@yarnpkg/fslib'
import { structUtils }              from '@yarnpkg/core'
import { ppath }                    from '@yarnpkg/fslib'
import { gitUtils }                 from '@yarnpkg/plugin-git'

import { toPortableCwd }            from '@atls/raijin/commands'

import { resolveCheckWorkspaces }   from '../selection.js'
import { selectAffectedWorkspaces } from '../selection.js'

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

test('a dependent root workspace collapses affected packages to one project check', () => {
  const root = workspace('root')
  const alpha = workspace('alpha', () => new Set([root]))
  const project = { topLevelWorkspace: root, workspaces: [root, alpha] } as Project

  assert.deepEqual(selectAffectedWorkspaces(project, new Set([alpha])), [root])
})

test('lockfile-only changes require one full-project check', async (t) => {
  const root = workspace('root')
  const project = {
    cwd: toPortableCwd('/project'),
    topLevelWorkspace: root,
    workspaces: [root],
  } as Project

  t.mock.method(gitUtils, 'fetchChangedWorkspaces', async () => new Set<Workspace>())
  t.mock.method(gitUtils, 'fetchRoot', async () => project.cwd)
  t.mock.method(gitUtils, 'fetchBase', async () => ({ hash: 'base', title: 'base' }))
  t.mock.method(gitUtils, 'fetchChangedFiles', async () => [
    ppath.resolve(project.cwd, Filename.lockfile),
  ])

  assert.deepEqual(await resolveCheckWorkspaces(project, 'base'), [root])
})

test('lockfile and package changes still require one full-project check', async (t) => {
  const root = workspace('root')
  const alpha = workspace('alpha')
  const project = {
    cwd: toPortableCwd('/project'),
    topLevelWorkspace: root,
    workspaces: [root, alpha],
  } as Project

  t.mock.method(gitUtils, 'fetchChangedWorkspaces', async () => new Set([alpha]))
  t.mock.method(gitUtils, 'fetchRoot', async () => project.cwd)
  t.mock.method(gitUtils, 'fetchBase', async () => ({ hash: 'base', title: 'base' }))
  t.mock.method(gitUtils, 'fetchChangedFiles', async () => [
    ppath.resolve(project.cwd, Filename.lockfile),
    ppath.resolve(project.cwd, 'packages/alpha/source.ts'),
  ])

  assert.deepEqual(await resolveCheckWorkspaces(project, 'base'), [root])
})

test('a native empty comparison remains a successful no-op', async (t) => {
  const root = workspace('root')
  const project = {
    cwd: toPortableCwd('/project'),
    topLevelWorkspace: root,
    workspaces: [root],
  } as Project

  t.mock.method(gitUtils, 'fetchChangedWorkspaces', async () => new Set<Workspace>())
  t.mock.method(gitUtils, 'fetchRoot', async () => project.cwd)
  t.mock.method(gitUtils, 'fetchBase', async () => ({ hash: 'base', title: 'base' }))
  t.mock.method(gitUtils, 'fetchChangedFiles', async () => [])

  assert.deepEqual(await resolveCheckWorkspaces(project, 'base'), [])
})
