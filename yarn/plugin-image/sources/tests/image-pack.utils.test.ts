import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { resolveBuildpackReference } from '../image-pack.utils.js'
import { resolveBuilderReference }   from '../image-pack.utils.js'

test('should use start-image buildpack by default', () => {
  assert.equal(resolveBuildpackReference({}), 'ghcr.io/atls/buildpack-yarn-workspace-start:0.1.3')
})

test('should keep buildpack version override on start-image buildpack', () => {
  assert.equal(
    resolveBuildpackReference({
      buildpackVersion: '0.1.3',
    }),
    'ghcr.io/atls/buildpack-yarn-workspace-start:0.1.3'
  )
})

test('should allow explicit buildpack image override with version pin', () => {
  assert.equal(
    resolveBuildpackReference({
      buildpackImage: 'registry.example.com/custom/buildpack',
      buildpackVersion: '2.0.0',
    }),
    'registry.example.com/custom/buildpack:2.0.0'
  )
})

test('should allow full buildpack reference override', () => {
  assert.equal(
    resolveBuildpackReference({
      buildpack: 'registry.example.com/custom/buildpack@sha256:1234',
      buildpackImage: 'registry.example.com/ignored/buildpack',
      buildpackVersion: '2.0.0',
    }),
    'registry.example.com/custom/buildpack@sha256:1234'
  )
})

test('should keep builder default and explicit override contract', () => {
  assert.equal(resolveBuilderReference({}), 'atlantislab/builder-base:24')

  assert.equal(
    resolveBuilderReference({
      builder: 'registry.example.com/custom/builder:latest',
      builderImage: 'registry.example.com/ignored/builder',
      builderTag: '20',
    }),
    'registry.example.com/custom/builder:latest'
  )
})
