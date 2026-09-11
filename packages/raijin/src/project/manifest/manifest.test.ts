import assert                           from 'node:assert/strict'
import test                             from 'node:test'

import { Manifest }                     from '@yarnpkg/core'

import { getManifestWorkspacePatterns } from './manifest.js'

const createManifest = (manifest: Record<string, unknown> = {}): Manifest =>
  Manifest.fromText(JSON.stringify(manifest))

test('should resolve array workspace patterns from normalized manifest', () => {
  const manifest = createManifest({ workspaces: ['packages/*'] })

  assert.deepEqual(getManifestWorkspacePatterns(manifest), ['packages/*'])
})

test('should resolve object workspace patterns from normalized manifest', () => {
  const manifest = createManifest({
    workspaces: {
      packages: ['apps/*', 'packages/*'],
    },
  })

  assert.deepEqual(getManifestWorkspacePatterns(manifest), ['apps/*', 'packages/*'])
})

test('should follow normalized Yarn workspace definitions', () => {
  const manifest = createManifest()

  manifest.workspaceDefinitions.push({ pattern: 'packages/*' })

  assert.deepEqual(getManifestWorkspacePatterns(manifest), ['packages/*'])
})
