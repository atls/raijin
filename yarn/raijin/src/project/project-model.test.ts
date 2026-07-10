import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'
import type { PortablePath }  from '@yarnpkg/fslib'

import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { Manifest }           from '@yarnpkg/core'

import { createProjectModel } from './workspaces.js'

const createManifest = (manifest: Record<string, unknown> = {}): Manifest =>
  Manifest.fromText(JSON.stringify(manifest))

const createWorkspace = (cwd: string, manifest: Manifest): Workspace =>
  ({
    cwd: cwd as PortablePath,
    manifest,
  }) as Workspace

const createProject = (workspaces: Array<Workspace>): Project =>
  ({
    topLevelWorkspace: workspaces[0],
    workspaces,
  }) as Project

test('should resolve single project model without workspace patterns', () => {
  const rootWorkspace = createWorkspace('/repo', createManifest({}))
  const model = createProjectModel(createProject([rootWorkspace]))

  assert.equal(model.cwd, '/repo')
  assert.equal(model.topLevelWorkspace, rootWorkspace)
  assert.equal(model.type, 'single')
  assert.deepEqual(model.workspacePatterns, [])
  assert.deepEqual(model.workspaces, [rootWorkspace])
})

test('should resolve monorepo project model from array workspace patterns', () => {
  const rootWorkspace = createWorkspace('/repo', createManifest({ workspaces: ['packages/*'] }))
  const clientWorkspace = createWorkspace('/repo/packages/client', createManifest({}))
  const model = createProjectModel(createProject([rootWorkspace, clientWorkspace]))

  assert.equal(model.type, 'monorepo')
  assert.deepEqual(model.workspacePatterns, ['packages/*'])
  assert.deepEqual(model.workspaces, [rootWorkspace, clientWorkspace])
})

test('should resolve monorepo project model from object workspace patterns', () => {
  const rootWorkspace = createWorkspace(
    '/repo',
    createManifest({
      workspaces: {
        packages: ['apps/*', 'packages/*'],
      },
    })
  )
  const model = createProjectModel(createProject([rootWorkspace]))

  assert.equal(model.type, 'monorepo')
  assert.deepEqual(model.workspacePatterns, ['apps/*', 'packages/*'])
})

test('should follow normalized Yarn workspace definitions', () => {
  const manifest = createManifest()

  manifest.workspaceDefinitions.push({ pattern: 'packages/*' })

  const rootWorkspace = createWorkspace('/repo', manifest)
  const model = createProjectModel(createProject([rootWorkspace]))

  assert.equal(model.type, 'monorepo')
  assert.deepEqual(model.workspacePatterns, ['packages/*'])
})

test('should keep the project boundary at the root when a leaf declares Raijin', () => {
  const rootWorkspace = createWorkspace(
    '/repo',
    createManifest({
      devDependencies: {
        '@atls/raijin': '^0.6.3',
      },
      workspaces: ['packages/*'],
    })
  )
  const clientWorkspace = createWorkspace(
    '/repo/packages/client',
    createManifest({
      dependencies: {
        '@atls/raijin': '^0.6.3',
      },
    })
  )
  const serverWorkspace = createWorkspace('/repo/packages/server', createManifest({}))
  const model = createProjectModel(createProject([rootWorkspace, clientWorkspace, serverWorkspace]))

  assert.equal(model.cwd, rootWorkspace.cwd)
  assert.equal(model.topLevelWorkspace, rootWorkspace)
  assert.deepEqual(model.workspaces, [rootWorkspace, clientWorkspace, serverWorkspace])
})
