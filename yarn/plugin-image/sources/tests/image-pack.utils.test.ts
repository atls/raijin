import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { parseAdditionalTags }       from '../image-pack.utils.js'
import { resolveBuildpackReference } from '../image-pack.utils.js'
import { resolveBuilderReference }   from '../image-pack.utils.js'

test('should use buildpack channel for the default Node line', () => {
  assert.equal(resolveBuildpackReference({}), 'ghcr.io/atls/buildpack-yarn-workspace:24')
})

test('should use selected Node line as buildpack channel', () => {
  assert.equal(
    resolveBuildpackReference({
      builderTag: '26',
    }),
    'ghcr.io/atls/buildpack-yarn-workspace:26'
  )
})

test('should keep buildpack version override as immutable semver pin', () => {
  assert.equal(
    resolveBuildpackReference({
      buildpackVersion: '0.1.3',
    }),
    'ghcr.io/atls/buildpack-yarn-workspace:0.1.3'
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

test('should parse additional image tag aliases', () => {
  assert.deepEqual(parseAdditionalTags(''), [])
  assert.deepEqual(parseAdditionalTags('stage, production'), ['stage', 'production'])
})

test('should reject invalid additional image tag aliases', () => {
  assert.throws(() => parseAdditionalTags('stage,,production'), /Invalid image tag alias/)
  assert.throws(() => parseAdditionalTags('stage/latest'), /Invalid image tag alias/)
})
