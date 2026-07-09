import type { Manifest }                     from '@yarnpkg/core'
import type { Project }                      from '@yarnpkg/core'
import type { Workspace }                    from '@yarnpkg/core'
import type { PortablePath }                 from '@yarnpkg/fslib'

import assert                                from 'node:assert/strict'
import test                                  from 'node:test'

import { structUtils }                       from '@yarnpkg/core'

import { createProjectModel }                from './workspaces.js'
import { getRaijinLeafDependencyWorkspaces } from './workspaces.js'

const createDescriptors = (dependencies: Record<string, string>) =>
  new Map(
    Object.entries(dependencies).map(([name, range]) => {
      const ident = structUtils.parseIdent(name)

      return [ident.identHash, structUtils.makeDescriptor(ident, range)]
    })
  )

const createManifest = ({
  dependencies = {},
  devDependencies = {},
  peerDependencies = {},
  workspaces,
}: {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  workspaces?: unknown
}): Manifest =>
  ({
    raw: {
      dependencies,
      devDependencies,
      peerDependencies,
      ...(typeof workspaces === 'undefined' ? {} : { workspaces }),
    },
    dependencies: createDescriptors(dependencies),
    devDependencies: createDescriptors(devDependencies),
    peerDependencies: createDescriptors(peerDependencies),
  }) as unknown as Manifest

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

test('should report leaf workspaces with direct Raijin dependency', () => {
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

  assert.deepEqual(getRaijinLeafDependencyWorkspaces(model), [clientWorkspace])
})
