import type { PortablePath }                              from '@yarnpkg/fslib'

import assert                                             from 'node:assert/strict'
import test                                               from 'node:test'
import { pathToFileURL }                                  from 'node:url'

import { structUtils }                                    from '@yarnpkg/core'
import { ppath }                                          from '@yarnpkg/fslib'
import { xfs }                                            from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE } from './renderer-build.utils.js'
import { assertRendererBuildExitCode }                    from './renderer-build.utils.js'
import { assertSupportedRendererNextVersion }             from './renderer-build.utils.js'
import { cleanupRendererBuildSourceArtifacts }            from './renderer-build.utils.js'
import { cleanupRendererBuildStaleArtifacts }             from './renderer-build.utils.js'
import { cleanupRendererBuildWorkspaceManifests }         from './renderer-build.utils.js'
import { copyRendererBuildPublicAssets }                  from './renderer-build.utils.js'
import { createNextRendererLoaderSource }                 from './renderer-build.utils.js'
import { createRendererBuildArgs }                        from './renderer-build.utils.js'
import { createRendererBuildEnv }                         from './renderer-build.utils.js'
import { extractNodeLoaderOption }                        from './renderer-build.utils.js'
import { normalizeNextPackageVersion }                    from './renderer-build.utils.js'
import { resolveNextPackageVersion }                      from './renderer-build.utils.js'
import { resolveRendererBuildPnpLoader }                  from './renderer-build.utils.js'
import { resolveRendererBuildStandaloneWorkspaceCwd }     from './renderer-build.utils.js'

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

test('should pass Next renderer loader through managed loader env', () => {
  const env = createRendererBuildEnv(
    {
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    },
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs'
  )

  assert.equal(
    env.NODE_OPTIONS,
    '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs'
  )
  assert.equal(env.RAIJIN_NODE_LOADER, 'file:///tmp/next-compiled-conf-require-cache-loader.mjs')
})

test('should extract existing node loader option from renderer build node options', () => {
  assert.deepEqual(
    extractNodeLoaderOption(
      '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs --enable-source-maps'
    ),
    {
      nodeOptions: '--require ./.pnp.cjs --enable-source-maps',
      loader: 'file:///.pnp.loader.mjs',
    }
  )
})

test('should extract PnP node loader without removing unrelated loaders', () => {
  assert.deepEqual(
    extractNodeLoaderOption(
      '--loader file:///tmp/custom-loader.mjs --experimental-loader file:///.pnp.loader.mjs'
    ),
    {
      nodeOptions: '--loader file:///tmp/custom-loader.mjs',
      loader: 'file:///.pnp.loader.mjs',
    }
  )
})

test('should resolve renderer PnP loader from project when managed env already removed it', async () => {
  const cwd = await xfs.mktempPromise()
  const pnpLoader = ppath.join(cwd, '.pnp.loader.mjs')

  await xfs.writeFilePromise(pnpLoader, '')

  assert.equal(
    await resolveRendererBuildPnpLoader(
      cwd,
      '--require ./.pnp.cjs --import data:text/javascript,managed-loader'
    ),
    pathToFileURL(pnpLoader).href
  )
})

test('should create combined renderer loader source with PnP loader delegation', () => {
  const source = createNextRendererLoaderSource('file:///.pnp.loader.mjs')

  assert.match(source, /import \* as pnpLoader from "file:\/\/\/\.pnp\.loader\.mjs"/)
  assert.match(source, /pnpLoader.resolve/)
  assert.match(source, /pnpLoader.load/)
})

test('should reject unsupported Next versions before 16', () => {
  for (const version of ['14.0.0', '14.2.24', '15.0.0', '15.3.1', '15.5.0']) {
    const error = {
      message: `Renderer build requires Next.js 16 or newer, found ${version}`,
    }

    assert.throws(() => {
      createRendererBuildArgs(version)
    }, error)
    assert.throws(() => {
      assertSupportedRendererNextVersion(version)
    }, error)
  }
})

test('should use explicit webpack build arguments for Next versions after 15', () => {
  assert.deepEqual(createRendererBuildArgs('16.0.7'), ['node', 'next', 'build', '--webpack', 'src'])
})

test('should normalize Next npm package references before version checks', () => {
  assert.equal(normalizeNextPackageVersion('npm:16.2.9'), '16.2.9')
  assert.deepEqual(createRendererBuildArgs(normalizeNextPackageVersion('npm:16.2.9')), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should devirtualize Next locator references before version checks', () => {
  const locator = structUtils.makeLocator(
    structUtils.makeIdent(null, 'next'),
    'virtual:peer-reference#npm:16.2.9'
  )

  assert.equal(resolveNextPackageVersion(locator), '16.2.9')
  assert.deepEqual(createRendererBuildArgs(resolveNextPackageVersion(locator)), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should normalize patched Next package references before version checks', () => {
  const reference = 'patch:next@npm%3A16.2.9#~/.yarn/patches/next.patch'

  assert.equal(normalizeNextPackageVersion(reference), '16.2.9')
  assert.deepEqual(createRendererBuildArgs(normalizeNextPackageVersion(reference)), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should avoid version-specific Next build arguments when version is unknown', () => {
  assert.deepEqual(createRendererBuildArgs(undefined), ['node', 'next', 'build', 'src'])
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

test('should patch Next config require hook extensions access in loader source', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/build/next-config-ts/require-hook.js',
    {},
    async () => ({
      source:
        "const oldJSHook = require.extensions['.js']; require.extensions['.js'] = hook; delete require.extensions[ext];",
    })
  )

  assert.equal(
    result.source,
    "const requireExtensions = require.extensions || _nodemodule.default._extensions;\nconst oldJSHook = requireExtensions['.js']; requireExtensions['.js'] = hook; delete requireExtensions[ext];"
  )
})

test('should patch Next require cache scanner access in loader source', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/compiled/webpack/bundle5.js',
    {},
    async () => ({
      source: 'before const $=require.cache[ct]; after',
    })
  )

  assert.equal(result.source, 'before const $=require.cache?.[ct]; after')
})

test('should patch Next webpack config node protocol handling in loader source', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/build/webpack-config.js',
    {},
    async () => ({
      source: '(isClient || isEdgeServer) && new bundler.ProvidePlugin({',
    })
  )

  assert.equal(result.source.includes('new bundler.NormalModuleReplacementPlugin(/^node:/'), true)
  assert.equal(result.source.includes("resource.request.replace(/^node:/, '')"), true)
  assert.equal(result.source.includes('new bundler.ProvidePlugin'), true)
})

test('should leave Next SWC source unchanged in loader source', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/esm/build/swc/index.js',
    {},
    async () => ({
      source:
        'const nativeBindingsDirectory = path.join(path.dirname(require.resolve("next/package.json")), "next-swc-fallback");',
    })
  )

  assert.equal(
    result.source,
    'const nativeBindingsDirectory = path.join(path.dirname(require.resolve("next/package.json")), "next-swc-fallback");'
  )
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

test('should resolve renderer standalone workspace path from nested workspace cwd', () => {
  assert.equal(
    resolveRendererBuildStandaloneWorkspaceCwd(
      '/repo' as PortablePath,
      '/repo/client' as PortablePath
    ),
    '/repo/client/src/.next/standalone/client'
  )
})

test('should resolve renderer standalone workspace path from project root cwd', () => {
  assert.equal(
    resolveRendererBuildStandaloneWorkspaceCwd('/repo' as PortablePath, '/repo' as PortablePath),
    '/repo/src/.next/standalone'
  )
})

test('should copy renderer public assets into standalone artifact', async () => {
  const cwd = await xfs.mktempPromise()

  await xfs.mkdirPromise(ppath.join(cwd, 'src/public/organization-logos'), { recursive: true })
  await xfs.writeFilePromise(ppath.join(cwd, 'src/public/Bg.png'), '')
  await xfs.writeFilePromise(ppath.join(cwd, 'src/public/organization-logos/atlantis.png'), '')

  await copyRendererBuildPublicAssets(cwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist/public/Bg.png')), true)
  assert.equal(
    await xfs.existsPromise(ppath.join(cwd, 'dist/public/organization-logos/atlantis.png')),
    true
  )
})

test('should ignore missing renderer public assets', async () => {
  const cwd = await xfs.mktempPromise()

  await copyRendererBuildPublicAssets(cwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist/public')), false)
})
