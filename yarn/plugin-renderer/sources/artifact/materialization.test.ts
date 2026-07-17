import assert                    from 'node:assert/strict'
import test                      from 'node:test'

import { ppath }                 from '@yarnpkg/fslib'
import { xfs }                   from '@yarnpkg/fslib'

import { materializeEntrypoint } from './entrypoint.js'
import { createArtifactLayout }  from './layout.js'
import { createArtifactTarget }  from './layout.js'
import { assertArtifactSource }  from './materialization.js'
import { copyEdgeChunks }        from './materialization.js'
import { copyPublicAssets }      from './materialization.js'
import { copyStandalone }        from './materialization.js'
import { copyStaticAssets }      from './materialization.js'

const createFixture = async (nested = false) => {
  const repoRoot = await xfs.mktempPromise()
  const rendererCwd = nested ? ppath.join(repoRoot, 'apps/web') : repoRoot
  const target = createArtifactTarget(rendererCwd)

  await xfs.mkdirPromise(target.appCwd, { recursive: true })
  const appCwd = await xfs.realpathPromise(target.appCwd)
  const tracingRoot = await xfs.realpathPromise(repoRoot)
  const nextOutputCwd = ppath.join(appCwd, '.next')
  const standaloneCwd = ppath.join(nextOutputCwd, 'standalone')
  const appRelativeCwd = ppath.relative(tracingRoot, appCwd)
  const layout = createArtifactLayout(target, {
    appCwd: target.appCwd,
    appRelativeCwd,
    nextOutputCwd,
    nextOutputRelativeCwd: ppath.relative(appCwd, nextOutputCwd),
    standaloneAppCwd: ppath.join(standaloneCwd, appRelativeCwd),
    standaloneCwd,
  })

  return { layout, rendererCwd }
}

test('should reject a standalone source without its metadata-selected server', async () => {
  const { layout } = await createFixture()

  await xfs.mkdirPromise(layout.standaloneCwd, { recursive: true })

  await assert.rejects(
    async () => assertArtifactSource(layout),
    new Error('Renderer build metadata does not reference a runnable Next standalone server')
  )
})

test('should preserve the full standalone root and launch its nested CommonJS server', async () => {
  const { layout, rendererCwd } = await createFixture(true)

  await xfs.mkdirPromise(ppath.join(layout.standaloneCwd, 'node_modules/next'), {
    recursive: true,
  })
  await xfs.mkdirPromise(layout.standaloneAppCwd, { recursive: true })
  await xfs.writeFilePromise(
    ppath.join(layout.standaloneCwd, 'node_modules/next/package.json'),
    '{}'
  )
  await xfs.writeFilePromise(ppath.join(layout.standaloneAppCwd, 'server.js'), 'server')

  await assertArtifactSource(layout)
  await copyStandalone(layout)
  await materializeEntrypoint(layout)

  assert.equal(
    await xfs.existsPromise(ppath.join(rendererCwd, 'dist/node_modules/next/package.json')),
    true
  )
  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'server.cjs')), true)
  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'server.js')), false)
  assert.equal(
    (await xfs.readFilePromise(ppath.join(layout.distCwd, 'index.cjs'))).toString(),
    'import("./apps/web/src/server.cjs").catch((error) => {\n  console.error(error)\n  process.exitCode = 1\n})\n'
  )
})

test('should preserve Next module classification for an ESM server', async () => {
  const { layout } = await createFixture()

  await xfs.mkdirPromise(layout.standaloneAppCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(layout.standaloneAppCwd, 'package.json'), {
    type: 'module',
  })
  await xfs.writeFilePromise(ppath.join(layout.standaloneAppCwd, 'server.js'), 'export {}')

  await copyStandalone(layout)
  await materializeEntrypoint(layout)

  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'package.json')), true)
  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'server.js')), true)
  assert.equal(
    (await xfs.readFilePromise(ppath.join(layout.distCwd, 'index.cjs'))).toString(),
    'import("./src/server.js").catch((error) => {\n  console.error(error)\n  process.exitCode = 1\n})\n'
  )
})

test('should copy static and edge assets beside the nested standalone server', async () => {
  const { layout } = await createFixture(true)

  await xfs.mkdirPromise(ppath.join(layout.nextOutputCwd, 'static/chunks'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(layout.nextOutputCwd, 'server/edge-chunks'), {
    recursive: true,
  })
  await xfs.writeFilePromise(ppath.join(layout.nextOutputCwd, 'static/chunks/app.js'), '')
  await xfs.writeFilePromise(ppath.join(layout.nextOutputCwd, 'server/edge-chunks/edge.js'), '')

  await copyStaticAssets(layout)
  await copyEdgeChunks(layout)

  assert.equal(
    await xfs.existsPromise(ppath.join(layout.artifactAppCwd, '.next/static/chunks/app.js')),
    true
  )
  assert.equal(
    await xfs.existsPromise(ppath.join(layout.artifactAppCwd, '.next/server/edge-chunks/edge.js')),
    true
  )
})

test('should copy root public assets beside the nested standalone server', async () => {
  const { layout, rendererCwd } = await createFixture(true)

  await xfs.mkdirPromise(ppath.join(rendererCwd, 'public/organization-logos'), {
    recursive: true,
  })
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/Bg.png'), '')
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/organization-logos/atlantis.png'), '')

  await copyPublicAssets(layout)

  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'public/Bg.png')), true)
  assert.equal(
    await xfs.existsPromise(
      ppath.join(layout.artifactAppCwd, 'public/organization-logos/atlantis.png')
    ),
    true
  )
})

test('should prefer application public assets over root public assets', async () => {
  const { layout, rendererCwd } = await createFixture()

  await xfs.mkdirPromise(ppath.join(rendererCwd, 'public'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(layout.appCwd, 'public'), { recursive: true })
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/Bg.png'), 'root')
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/root-only.png'), '')
  await xfs.writeFilePromise(ppath.join(layout.appCwd, 'public/Bg.png'), 'source')

  await copyPublicAssets(layout)

  assert.equal(
    (await xfs.readFilePromise(ppath.join(layout.artifactAppCwd, 'public/Bg.png'))).toString(),
    'source'
  )
  assert.equal(
    await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'public/root-only.png')),
    false
  )
})

test('should ignore missing public assets', async () => {
  const { layout } = await createFixture()

  await copyPublicAssets(layout)

  assert.equal(await xfs.existsPromise(ppath.join(layout.artifactAppCwd, 'public')), false)
})
