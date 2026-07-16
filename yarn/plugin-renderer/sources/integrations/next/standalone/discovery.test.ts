import type { PortablePath }                   from '@yarnpkg/fslib'

import assert                                  from 'node:assert/strict'
import test                                    from 'node:test'

import { npath }                               from '@yarnpkg/fslib'
import { ppath }                               from '@yarnpkg/fslib'
import { xfs }                                 from '@yarnpkg/fslib'

import { resolveNextStandaloneArtifactSource } from './discovery.js'
import { snapshotNextStandaloneManifests }     from './discovery.js'

interface StandaloneFixture {
  readonly appCwd: PortablePath
  readonly nextOutputCwd: PortablePath
  readonly rendererCwd: PortablePath
  readonly tracingRoot: PortablePath
}

const createFixture = async (nested = false): Promise<StandaloneFixture> => {
  const tracingRoot = await xfs.mktempPromise()
  const rendererCwd = nested ? ppath.join(tracingRoot, 'apps/web') : tracingRoot
  const appCwd = ppath.join(rendererCwd, 'src')
  const nextOutputCwd = ppath.join(appCwd, '.next')

  await xfs.mkdirPromise(appCwd, { recursive: true })

  return {
    appCwd: await xfs.realpathPromise(appCwd),
    nextOutputCwd,
    rendererCwd,
    tracingRoot: await xfs.realpathPromise(tracingRoot),
  }
}

const writeManifest = async (
  fixture: StandaloneFixture,
  options: {
    readonly appRelativeCwd?: PortablePath
    readonly nextOutputCwd?: PortablePath
    readonly tracingRoot?: PortablePath
  } = {}
): Promise<void> => {
  const nextOutputCwd = options.nextOutputCwd ?? fixture.nextOutputCwd
  const tracingRoot = options.tracingRoot ?? fixture.tracingRoot
  const appRelativeCwd = options.appRelativeCwd ?? ppath.relative(tracingRoot, fixture.appCwd)

  await xfs.mkdirPromise(nextOutputCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(nextOutputCwd, 'required-server-files.json'), {
    appDir: npath.fromPortablePath(fixture.appCwd),
    relativeAppDir: npath.fromPortablePath(appRelativeCwd),
    config: {
      output: 'standalone',
      outputFileTracingRoot: npath.fromPortablePath(tracingRoot),
    },
  })
}

test('should resolve nested standalone topology from current Next metadata', async () => {
  const fixture = await createFixture(true)
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)

  await writeManifest(fixture)
  const source = await resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot)

  assert.equal(source.appCwd, fixture.appCwd)
  assert.equal(source.nextOutputCwd, await xfs.realpathPromise(fixture.nextOutputCwd))
  assert.equal(source.nextOutputRelativeCwd, '.next')
  assert.equal(source.appRelativeCwd, 'apps/web/src')
  assert.equal(source.standaloneCwd, ppath.join(source.nextOutputCwd, 'standalone'))
  assert.equal(source.standaloneAppCwd, ppath.join(source.nextOutputCwd, 'standalone/apps/web/src'))
})

test('should accept an application at the Next tracing root', async () => {
  const fixture = await createFixture()
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)

  await writeManifest(fixture, {
    appRelativeCwd: '' as PortablePath,
    tracingRoot: fixture.appCwd,
  })
  const source = await resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot)

  assert.equal(source.appRelativeCwd, '')
  assert.equal(source.nextOutputRelativeCwd, '.next')
  assert.equal(source.standaloneAppCwd, source.standaloneCwd)
})

test('should reject builds without a current Next standalone manifest', async () => {
  const fixture = await createFixture()

  await assert.rejects(
    async () => resolveNextStandaloneArtifactSource(fixture.appCwd, new Map()),
    new Error('Renderer build did not produce a current Next standalone manifest')
  )
})

test('should ignore unchanged stale manifests when selecting custom dist output', async () => {
  const fixture = await createFixture()

  await writeManifest(fixture)
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)
  const currentOutputCwd = ppath.join(fixture.appCwd, 'build')

  await writeManifest(fixture, { nextOutputCwd: currentOutputCwd })
  const source = await resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot)

  assert.equal(source.nextOutputCwd, await xfs.realpathPromise(currentOutputCwd))
})

test('should reject inconsistent application paths in current Next metadata', async () => {
  const fixture = await createFixture()
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)

  await writeManifest(fixture, { appRelativeCwd: '../outside' as PortablePath })

  await assert.rejects(
    async () => resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot),
    new Error('Renderer build received inconsistent Next standalone manifest paths')
  )
})

test('should reject an application outside the Next tracing root', async () => {
  const fixture = await createFixture()
  const childTracingRoot = ppath.join(fixture.appCwd, 'child')
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)

  await xfs.mkdirPromise(childTracingRoot, { recursive: true })
  await writeManifest(fixture, {
    appRelativeCwd: '..' as PortablePath,
    tracingRoot: childTracingRoot,
  })

  await assert.rejects(
    async () => resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot),
    new Error('Renderer build received inconsistent Next standalone manifest paths')
  )
})

test('should reject relative tracing roots in current Next metadata', async () => {
  const fixture = await createFixture()
  const snapshot = await snapshotNextStandaloneManifests(fixture.appCwd)

  await writeManifest(fixture, { tracingRoot: '..' as PortablePath })

  await assert.rejects(
    async () => resolveNextStandaloneArtifactSource(fixture.appCwd, snapshot),
    new Error('Renderer build received inconsistent Next standalone manifest paths')
  )
})
