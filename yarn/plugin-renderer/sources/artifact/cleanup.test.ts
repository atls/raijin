import assert                        from 'node:assert/strict'
import test                          from 'node:test'

import { ppath }                     from '@yarnpkg/fslib'
import { xfs }                       from '@yarnpkg/fslib'

import { cleanupDiscoveryArtifacts } from './cleanup.js'
import { cleanupSourceArtifacts }    from './cleanup.js'
import { cleanupTargetArtifacts }    from './cleanup.js'
import { createArtifactLayout }      from './layout.js'
import { createArtifactTarget }      from './layout.js'

test('should remove stale target artifacts before project discovery', async () => {
  const cwd = await xfs.mktempPromise()
  const target = createArtifactTarget(cwd)

  await xfs.mkdirPromise(target.distCwd, { recursive: true })
  await xfs.mkdirPromise(ppath.join(cwd, '.next'), { recursive: true })
  await xfs.mkdirPromise(target.appCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(target.distCwd, 'package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, '.next/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(target.appCwd, 'package.json'), { type: 'module' })

  await cleanupTargetArtifacts(target)

  assert.equal(await xfs.existsPromise(target.distCwd), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, '.next')), false)
  assert.equal(await xfs.existsPromise(ppath.join(target.appCwd, 'package.json')), false)
})

test('should remove a stale source manifest from a nested invocation cwd', async () => {
  const cwd = await xfs.mktempPromise()
  const nestedCwd = ppath.join(cwd, 'src/app/pages')

  await xfs.mkdirPromise(nestedCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/package.json'), { type: 'module' })

  await cleanupDiscoveryArtifacts(nestedCwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/package.json')), false)
})

test('should keep a real source workspace manifest during discovery cleanup', async () => {
  const cwd = await xfs.mktempPromise()
  const nestedCwd = ppath.join(cwd, 'packages/src/app')
  const manifestPath = ppath.join(cwd, 'packages/src/package.json')
  const manifest = {
    name: '@internal/src',
    type: 'module',
  }

  await xfs.mkdirPromise(nestedCwd, { recursive: true })
  await xfs.writeJsonPromise(manifestPath, manifest)

  await cleanupDiscoveryArtifacts(nestedCwd)

  assert.equal(await xfs.existsPromise(manifestPath), true)
  assert.deepEqual(await xfs.readJsonPromise(manifestPath), manifest)
})

test('should keep a real renderer source manifest during target cleanup', async () => {
  const cwd = await xfs.mktempPromise()
  const target = createArtifactTarget(cwd)
  const manifestPath = ppath.join(target.appCwd, 'package.json')
  const manifest = {
    dependencies: {
      next: '16.0.0',
    },
    type: 'module',
  }

  await xfs.mkdirPromise(target.appCwd, { recursive: true })
  await xfs.writeJsonPromise(manifestPath, manifest)

  await cleanupTargetArtifacts(target)

  assert.equal(await xfs.existsPromise(manifestPath), true)
  assert.deepEqual(await xfs.readJsonPromise(manifestPath), manifest)
})

test('should remove the selected Next output after artifact materialization', async () => {
  const cwd = await xfs.mktempPromise()
  const target = createArtifactTarget(cwd)

  await xfs.mkdirPromise(target.appCwd, { recursive: true })
  const appCwd = await xfs.realpathPromise(target.appCwd)
  const nextOutputCwd = ppath.join(appCwd, 'build')

  await xfs.mkdirPromise(nextOutputCwd, { recursive: true })
  const layout = createArtifactLayout(target, {
    appCwd,
    appRelativeCwd: ppath.relative(cwd, appCwd),
    nextOutputCwd,
    nextOutputRelativeCwd: ppath.relative(appCwd, nextOutputCwd),
    standaloneAppCwd: ppath.join(nextOutputCwd, 'standalone/src'),
    standaloneCwd: ppath.join(nextOutputCwd, 'standalone'),
  })

  await cleanupSourceArtifacts(layout)

  assert.equal(await xfs.existsPromise(nextOutputCwd), false)
})
