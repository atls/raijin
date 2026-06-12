import assert                                             from 'node:assert/strict'
import test                                               from 'node:test'

import { ppath }                                          from '@yarnpkg/fslib'
import { xfs }                                            from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE } from './renderer-build.utils.js'
import { assertRendererBuildExitCode }                    from './renderer-build.utils.js'
import { cleanupRendererBuildSourceArtifacts }            from './renderer-build.utils.js'
import { cleanupRendererBuildStaleArtifacts }             from './renderer-build.utils.js'
import { cleanupRendererBuildWorkspaceManifests }         from './renderer-build.utils.js'
import { createRendererBuildEnv }                         from './renderer-build.utils.js'

test('should disable Next telemetry for renderer build', () => {
  const env = createRendererBuildEnv(
    {
      NEXT_TELEMETRY_DISABLED: '0',
      NODE_ENV: 'production',
    },
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs'
  )

  assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
  assert.equal(env.NODE_ENV, 'production')
})

test('should append Next compiled conf loader to renderer build node options', () => {
  const env = createRendererBuildEnv(
    {
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    },
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs'
  )

  assert.equal(
    env.NODE_OPTIONS,
    '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs --experimental-loader file:///tmp/next-compiled-conf-require-cache-loader.mjs'
  )
})

test('should patch Next compiled conf require cache deletion in loader source', async () => {
  const loader = (await import(
    `data:text/javascript,${encodeURIComponent(NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE)}`
  )) as {
    load: (
      url: string,
      context: Record<string, unknown>,
      nextLoad: (url: string, context: Record<string, unknown>) => Promise<{ source: string }>
    ) => Promise<{ source: string }>
  }

  const result = await loader.load(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/compiled/conf/index.js',
    {},
    async () => ({
      source: 'before delete require.cache[__filename] after',
    })
  )

  assert.equal(result.source, 'before if (require.cache) delete require.cache[__filename] after')
})

test('should accept successful renderer build exit code', () => {
  assert.doesNotThrow(() => {
    assertRendererBuildExitCode(0)
  })
})

test('should reject failed renderer build exit code', () => {
  assert.throws(() => {
    assertRendererBuildExitCode(1)
  }, /Renderer build failed with exit code 1/)
})

test('should remove stale renderer artifacts before project discovery', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.mkdirPromise(ppath.join(cwd, 'dist'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(cwd, 'src/.next'), { recursive: true })
  await xfs.writeJsonPromise(ppath.join(cwd, 'dist/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/.next/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/package.json'), {})

  await cleanupRendererBuildStaleArtifacts(cwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist')), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/.next')), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/package.json')), false)
})

test('should remove renderer workspace manifests without removing dist output', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.mkdirPromise(ppath.join(cwd, 'dist'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(cwd, 'src/.next'), { recursive: true })
  await xfs.writeFilePromise(ppath.join(cwd, 'dist/index.js'), '')
  await xfs.writeJsonPromise(ppath.join(cwd, 'dist/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/.next/package.json'), {})

  await cleanupRendererBuildWorkspaceManifests(cwd)
  await cleanupRendererBuildSourceArtifacts(cwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist/index.js')), true)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist/package.json')), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/.next')), false)
})
