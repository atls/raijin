import type { PortablePath }    from '@yarnpkg/fslib'

import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { ppath }                from '@yarnpkg/fslib'

import { createArtifactLayout } from './layout.js'
import { createArtifactTarget } from './layout.js'

test('should map a nested Next standalone source into the renderer artifact', () => {
  const rendererCwd = '/repo/apps/web' as PortablePath
  const target = createArtifactTarget(rendererCwd)
  const layout = createArtifactLayout(target, {
    appCwd: '/repo/apps/web/src' as PortablePath,
    appRelativeCwd: 'apps/web/src' as PortablePath,
    nextOutputCwd: '/repo/apps/web/src/.next' as PortablePath,
    nextOutputRelativeCwd: '.next' as PortablePath,
    standaloneAppCwd: '/repo/apps/web/src/.next/standalone/apps/web/src' as PortablePath,
    standaloneCwd: '/repo/apps/web/src/.next/standalone' as PortablePath,
  })

  assert.equal(layout.artifactAppCwd, ppath.join(rendererCwd, 'dist/apps/web/src'))
  assert.equal(layout.artifactNextOutputCwd, ppath.join(rendererCwd, 'dist/apps/web/src/.next'))
})

test('should reject a source that belongs to another application', () => {
  const target = createArtifactTarget('/repo' as PortablePath)

  assert.throws(
    () =>
      createArtifactLayout(target, {
        appCwd: '/other/src' as PortablePath,
        appRelativeCwd: 'src' as PortablePath,
        nextOutputCwd: '/other/src/.next' as PortablePath,
        nextOutputRelativeCwd: '.next' as PortablePath,
        standaloneAppCwd: '/other/src/.next/standalone/src' as PortablePath,
        standaloneCwd: '/other/src/.next/standalone' as PortablePath,
      }),
    new Error('Renderer artifact source does not belong to the selected application')
  )
})

test('should reject a source that resolves outside the artifact target', () => {
  const target = createArtifactTarget('/repo' as PortablePath)

  assert.throws(
    () =>
      createArtifactLayout(target, {
        appCwd: target.appCwd,
        appRelativeCwd: '../outside' as PortablePath,
        nextOutputCwd: '/repo/src/.next' as PortablePath,
        nextOutputRelativeCwd: '.next' as PortablePath,
        standaloneAppCwd: '/repo/src/.next/standalone/outside' as PortablePath,
        standaloneCwd: '/repo/src/.next/standalone' as PortablePath,
      }),
    new Error('Renderer artifact source resolves outside the selected target')
  )
})
