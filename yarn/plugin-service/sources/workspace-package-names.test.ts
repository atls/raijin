import type { Descriptor }          from '@yarnpkg/core'
import type { Workspace }           from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { structUtils }              from '@yarnpkg/core'

import { getWorkspacePackageNames } from './workspace-package-names.js'

type ManifestDependencies = Partial<Record<string, Map<string, Descriptor>>>

const createManifest = (
  name: string | null,
  dependencies: ManifestDependencies = {}
): Workspace['manifest'] =>
  ({
    getForScope: (dependencyType: string) => dependencies[dependencyType] ?? new Map(),
    name: name ? structUtils.parseIdent(name) : null,
  }) as Workspace['manifest']

test('should read package names from workspace dependencies resolved by Yarn', () => {
  const dependencyDescriptor = structUtils.parseDescriptor('@internal/module@workspace:*')
  const transitiveDescriptor = structUtils.parseDescriptor('@internal/transitive@workspace:*')
  const dependencyByDescriptor = new Map<string, Workspace>()
  const project = {
    tryWorkspaceByDescriptor: (descriptor: Descriptor) =>
      dependencyByDescriptor.get(descriptor.descriptorHash) ?? null,
  } as Workspace['project']
  const transitiveWorkspace = {
    manifest: createManifest('@internal/transitive'),
    project,
  } as Workspace
  const dependencyWorkspace = {
    manifest: createManifest('@internal/module', {
      dependencies: new Map([['@internal/transitive', transitiveDescriptor]]),
    }),
    project,
  } as Workspace
  const serviceWorkspace = {
    manifest: createManifest('service', {
      dependencies: new Map([['@internal/module', dependencyDescriptor]]),
    }),
    project,
  } as Workspace

  dependencyByDescriptor.set(dependencyDescriptor.descriptorHash, dependencyWorkspace)
  dependencyByDescriptor.set(transitiveDescriptor.descriptorHash, transitiveWorkspace)

  assert.deepEqual(getWorkspacePackageNames(serviceWorkspace), [
    '@internal/module',
    '@internal/transitive',
  ])
})

test('should read package names from workspace peer dependencies resolved by Yarn', () => {
  const peerDescriptor = structUtils.parseDescriptor('@internal/peer@workspace:*')
  const dependencyByDescriptor = new Map<string, Workspace>()
  const project = {
    tryWorkspaceByDescriptor: (descriptor: Descriptor) =>
      dependencyByDescriptor.get(descriptor.descriptorHash) ?? null,
  } as Workspace['project']
  const peerWorkspace = {
    manifest: createManifest('@internal/peer'),
    project,
  } as Workspace
  const serviceWorkspace = {
    manifest: createManifest('service', {
      peerDependencies: new Map([['@internal/peer', peerDescriptor]]),
    }),
    project,
  } as Workspace

  dependencyByDescriptor.set(peerDescriptor.descriptorHash, peerWorkspace)

  assert.deepEqual(getWorkspacePackageNames(serviceWorkspace), ['@internal/peer'])
})

test('should ignore registry dependencies with colliding workspace names', () => {
  const registryDescriptor = structUtils.parseDescriptor('@internal/module@npm:^2.0.0')
  const dependencyByDescriptor = new Map<string, Workspace>()
  const project = {
    tryWorkspaceByDescriptor: (descriptor: Descriptor) =>
      dependencyByDescriptor.get(descriptor.descriptorHash) ?? null,
  } as Workspace['project']
  const serviceWorkspace = {
    manifest: createManifest('service', {
      dependencies: new Map([['@internal/module', registryDescriptor]]),
    }),
    project,
  } as Workspace

  assert.deepEqual(getWorkspacePackageNames(serviceWorkspace), [])
})
