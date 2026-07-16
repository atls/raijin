import type { PortablePath }                              from '@yarnpkg/fslib'

import assert                                             from 'node:assert/strict'
import test                                               from 'node:test'
import { pathToFileURL }                                  from 'node:url'

import { structUtils }                                    from '@yarnpkg/core'
import { ppath }                                          from '@yarnpkg/fslib'
import { xfs }                                            from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE } from './renderer-build.utils.js'
import { assertRendererBuildExitCode }                    from './renderer-build.utils.js'
import { assertRendererBuildStandaloneOutput }            from './renderer-build.utils.js'
import { assertSupportedRendererNextVersion }             from './renderer-build.utils.js'
import { cleanupRendererBuildDiscoveryArtifacts }         from './renderer-build.utils.js'
import { cleanupRendererBuildSourceArtifacts }            from './renderer-build.utils.js'
import { cleanupRendererBuildStaleArtifacts }             from './renderer-build.utils.js'
import { copyRendererBuildEdgeChunks }                    from './renderer-build.utils.js'
import { copyRendererBuildPublicAssets }                  from './renderer-build.utils.js'
import { copyRendererBuildStandaloneFiles }               from './renderer-build.utils.js'
import { copyRendererBuildStaticAssets }                  from './renderer-build.utils.js'
import { createNextRendererLoaderSource }                 from './renderer-build.utils.js'
import { createRendererBuildContext }                     from './renderer-build.utils.js'
import { createRendererBuildArgs }                        from './renderer-build.utils.js'
import { createRendererBuildEnv }                         from './renderer-build.utils.js'
import { extractNodeLoaderOption }                        from './renderer-build.utils.js'
import { materializeRendererBuildEntrypoint }             from './renderer-build.utils.js'
import { normalizeNextPackageVersion }                    from './renderer-build.utils.js'
import { resolveNextPackageVersion }                      from './renderer-build.utils.js'
import { resolveRendererBuildArtifactContext }            from './renderer-build.utils.js'
import { resolveRendererBuildPnpLoader }                  from './renderer-build.utils.js'
import { resolveRendererBuildStandaloneCwd }              from './renderer-build.utils.js'
import { snapshotRendererBuildManifests }                 from './renderer-build.utils.js'

test('should disable Next telemetry for renderer build', () => {
  const env = createRendererBuildEnv(
    {
      NEXT_TELEMETRY_DISABLED: '0',
      NODE_ENV: 'production',
    },
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs',
    '/repo/client' as PortablePath
  )

  assert.equal(env.NEXT_TELEMETRY_DISABLED, '1')
  assert.equal(env.NODE_ENV, 'production')
  assert.equal(env.RAIJIN_RENDERER_WORKSPACE_CWD, '/repo/client')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, undefined)
})

test('should pass renderer build output when requested', () => {
  const env = createRendererBuildEnv(
    {},
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs',
    '/repo/client' as PortablePath,
    {
      nextConfigAdapterPath: '/tmp/raijin-next-config-adapter.cjs' as PortablePath,
      output: 'standalone',
    }
  )

  assert.equal(env.NEXT_ADAPTER_PATH, '/tmp/raijin-next-config-adapter.cjs')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, 'standalone')
})

test('should pass the Next adapter without forcing renderer build output', () => {
  const env = createRendererBuildEnv(
    {},
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs',
    '/repo/client' as PortablePath,
    {
      nextConfigAdapterPath: '/tmp/raijin-next-config-adapter.cjs' as PortablePath,
    }
  )

  assert.equal(env.NEXT_ADAPTER_PATH, '/tmp/raijin-next-config-adapter.cjs')
  assert.equal(env.RAIJIN_RENDERER_OUTPUT, undefined)
})

test('should pass Next renderer loader through managed loader env', () => {
  const env = createRendererBuildEnv(
    {
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    },
    'file:///tmp/next-compiled-conf-require-cache-loader.mjs',
    '/repo/client' as PortablePath
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

test('should leave Next config values to the adapter boundary', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/server/config.js',
    {},
    async () => ({
      source: [
        'const result = {',
        '        ..._configshared.defaultConfig,',
        '        ...config,',
        '        experimental: {',
        '            ..._configshared.defaultConfig.experimental,',
        '            ...config.experimental',
        '        }',
        '    };',
      ].join('\n'),
    })
  )

  assert.equal(result.source.includes('result.experimental.extensionAlias ??= {'), false)
  assert.equal(result.source.includes('RAIJIN_RENDERER_OUTPUT'), false)
  assert.equal(result.source.includes('RAIJIN_RENDERER_WORKSPACE_CWD'), false)
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

test('should patch Next node manifest loader to read JSON manifests from disk', async () => {
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
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/server/route-matcher-providers/helpers/manifest-loaders/node-manifest-loader.js',
    {},
    async () => ({
      source: [
        'const _path = /*#__PURE__*/ _interop_require_default(require("../../../../shared/lib/isomorphic/path"));',
        'static require(id) {',
        '        try {',
        '            return require(id);',
        '        } catch  {',
        '            return null;',
        '        }',
        '    }',
      ].join('\n'),
    })
  )

  assert.equal(
    result.source.includes(
      'const _fs = /*#__PURE__*/ _interop_require_default(require("node:fs"));'
    ),
    true
  )
  assert.equal(
    result.source.includes("return JSON.parse(_fs.default.readFileSync(id, 'utf8'));"),
    true
  )
  assert.equal(result.source.includes('return require(id);'), true)
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

test('should leave Next webpack extension aliases to the adapter boundary', async () => {
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
      source: 'extensionAlias: config.experimental.extensionAlias,',
    })
  )

  assert.equal(result.source, 'extensionAlias: config.experimental.extensionAlias,')
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
  await xfs.mkdirPromise(ppath.join(cwd, '.next'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(cwd, 'src'), { recursive: true })
  await xfs.writeJsonPromise(ppath.join(cwd, 'dist/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, '.next/package.json'), {})
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/package.json'), { type: 'module' })

  await cleanupRendererBuildStaleArtifacts(cwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'dist')), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, '.next')), false)
  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/package.json')), false)
})

test('should remove stale renderer source manifest from nested source cwd before project discovery', async () => {
  const cwd = await xfs.mktempPromise()
  const nestedCwd = ppath.join(cwd, 'src/app/pages')

  await xfs.mkdirPromise(nestedCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(cwd, 'src/package.json'), { type: 'module' })

  await cleanupRendererBuildDiscoveryArtifacts(nestedCwd)

  assert.equal(await xfs.existsPromise(ppath.join(cwd, 'src/package.json')), false)
})

test('should keep real source workspace manifest before project discovery', async () => {
  const cwd = await xfs.mktempPromise()
  const nestedCwd = ppath.join(cwd, 'packages/src/app')
  const manifestPath = ppath.join(cwd, 'packages/src/package.json')
  const manifest = {
    name: '@internal/src',
    type: 'module',
  }

  await xfs.mkdirPromise(nestedCwd, { recursive: true })
  await xfs.writeJsonPromise(manifestPath, manifest)

  await cleanupRendererBuildDiscoveryArtifacts(nestedCwd)

  assert.equal(await xfs.existsPromise(manifestPath), true)
  assert.deepEqual(await xfs.readJsonPromise(manifestPath), manifest)
})

test('should keep real renderer source manifest during stale cleanup', async () => {
  const cwd = await xfs.mktempPromise()
  const manifestPath = ppath.join(cwd, 'src/package.json')
  const manifest = {
    dependencies: {
      next: '16.0.0',
    },
    type: 'module',
  }

  await xfs.mkdirPromise(ppath.dirname(manifestPath), { recursive: true })
  await xfs.writeJsonPromise(manifestPath, manifest)

  await cleanupRendererBuildStaleArtifacts(cwd)

  assert.equal(await xfs.existsPromise(manifestPath), true)
  assert.deepEqual(await xfs.readJsonPromise(manifestPath), manifest)
})

const createRendererArtifactFixture = async (nested = false) => {
  const repoRoot = await xfs.mktempPromise()
  const rendererCwd = nested ? ppath.join(repoRoot, 'apps/web') : repoRoot
  const projectDir = ppath.join(rendererCwd, 'src')
  const distDir = ppath.join(projectDir, '.next')
  const rendererBuildContext = createRendererBuildContext(rendererCwd)

  await xfs.mkdirPromise(projectDir, { recursive: true })
  const snapshot = await snapshotRendererBuildManifests(rendererBuildContext)
  const resolvedRepoRoot = await xfs.realpathPromise(repoRoot)
  const resolvedProjectDir = await xfs.realpathPromise(projectDir)

  await xfs.mkdirPromise(distDir, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(distDir, 'required-server-files.json'), {
    appDir: resolvedProjectDir,
    relativeAppDir: ppath.relative(resolvedRepoRoot, resolvedProjectDir),
    config: {
      distDir: '.next',
      output: 'standalone',
      outputFileTracingRoot: resolvedRepoRoot,
    },
  })

  const context = await resolveRendererBuildArtifactContext(rendererBuildContext, snapshot)

  return {
    context,
    distDir: await xfs.realpathPromise(distDir),
    projectDir: resolvedProjectDir,
    rendererCwd,
    repoRoot: resolvedRepoRoot,
  }
}

test('should resolve nested standalone topology from the current Next manifest', async () => {
  const { context, distDir, rendererCwd, repoRoot } = await createRendererArtifactFixture(true)

  assert.equal(context.nextOutputCwd, distDir)
  assert.equal(context.artifactNextOutputCwd, ppath.join(rendererCwd, 'dist/apps/web/src/.next'))
  assert.equal(context.standaloneCwd, ppath.join(distDir, 'standalone'))
  assert.equal(context.standaloneAppCwd, ppath.join(distDir, 'standalone/apps/web/src'))
  assert.equal(context.artifactAppCwd, ppath.join(rendererCwd, 'dist/apps/web/src'))
  assert.equal(resolveRendererBuildStandaloneCwd(distDir), ppath.join(distDir, 'standalone'))
  assert.equal(ppath.contains(repoRoot, context.standaloneAppCwd) !== null, true)
})

test('should reject renderer builds without a current Next standalone manifest', async () => {
  const cwd = await xfs.mktempPromise()
  const context = createRendererBuildContext(cwd)

  await xfs.mkdirPromise(context.appCwd, { recursive: true })

  await assert.rejects(
    async () => resolveRendererBuildArtifactContext(context, new Map()),
    new Error('Renderer build did not produce a current Next standalone manifest')
  )
})

test('should ignore unchanged stale Next manifests when resolving custom dist output', async () => {
  const cwd = await xfs.mktempPromise()
  const context = createRendererBuildContext(cwd)
  const projectDir = context.appCwd
  const staleDistDir = ppath.join(projectDir, '.next')
  const currentDistDir = ppath.join(projectDir, 'build')

  await xfs.mkdirPromise(staleDistDir, { recursive: true })
  const resolvedCwd = await xfs.realpathPromise(cwd)
  const resolvedProjectDir = await xfs.realpathPromise(projectDir)
  const manifest = {
    appDir: resolvedProjectDir,
    relativeAppDir: 'src',
    config: {
      output: 'standalone',
      outputFileTracingRoot: resolvedCwd,
    },
  }

  await xfs.writeJsonPromise(ppath.join(staleDistDir, 'required-server-files.json'), manifest)
  const snapshot = await snapshotRendererBuildManifests(context)

  await xfs.mkdirPromise(currentDistDir, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(currentDistDir, 'required-server-files.json'), manifest)

  const artifactContext = await resolveRendererBuildArtifactContext(context, snapshot)

  assert.equal(artifactContext.nextOutputCwd, await xfs.realpathPromise(currentDistDir))
  assert.equal(artifactContext.artifactNextOutputCwd, ppath.join(cwd, 'dist/src/build'))

  await xfs.mkdirPromise(ppath.join(currentDistDir, 'static/chunks'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(currentDistDir, 'server/edge-chunks'), { recursive: true })
  await xfs.writeFilePromise(ppath.join(currentDistDir, 'static/chunks/app.js'), '')
  await xfs.writeFilePromise(ppath.join(currentDistDir, 'server/edge-chunks/edge.js'), '')

  await copyRendererBuildStaticAssets(artifactContext)
  await copyRendererBuildEdgeChunks(artifactContext)

  assert.equal(
    await xfs.existsPromise(
      ppath.join(artifactContext.artifactNextOutputCwd, 'static/chunks/app.js')
    ),
    true
  )
  assert.equal(
    await xfs.existsPromise(
      ppath.join(artifactContext.artifactNextOutputCwd, 'server/edge-chunks/edge.js')
    ),
    true
  )

  await cleanupRendererBuildSourceArtifacts(artifactContext)

  assert.equal(await xfs.existsPromise(currentDistDir), false)
})

test('should reject inconsistent paths in the current Next standalone manifest', async () => {
  const cwd = await xfs.mktempPromise()
  const context = createRendererBuildContext(cwd)
  const distDir = ppath.join(context.appCwd, '.next')

  await xfs.mkdirPromise(context.appCwd, { recursive: true })
  const snapshot = await snapshotRendererBuildManifests(context)
  const resolvedCwd = await xfs.realpathPromise(cwd)
  const resolvedAppCwd = await xfs.realpathPromise(context.appCwd)

  await xfs.mkdirPromise(distDir, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(distDir, 'required-server-files.json'), {
    appDir: resolvedAppCwd,
    relativeAppDir: '../outside',
    config: {
      output: 'standalone',
      outputFileTracingRoot: resolvedCwd,
    },
  })

  await assert.rejects(
    async () => resolveRendererBuildArtifactContext(context, snapshot),
    new Error('Renderer build received inconsistent Next standalone manifest paths')
  )
})

test('should reject relative owner paths in the current Next standalone manifest', async () => {
  const cwd = await xfs.mktempPromise()
  const context = createRendererBuildContext(cwd)
  const distDir = ppath.join(context.appCwd, '.next')

  await xfs.mkdirPromise(context.appCwd, { recursive: true })
  const snapshot = await snapshotRendererBuildManifests(context)
  const resolvedAppCwd = await xfs.realpathPromise(context.appCwd)

  await xfs.mkdirPromise(distDir, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(distDir, 'required-server-files.json'), {
    appDir: resolvedAppCwd,
    relativeAppDir: 'src',
    config: {
      output: 'standalone',
      outputFileTracingRoot: '..',
    },
  })

  await assert.rejects(
    async () => resolveRendererBuildArtifactContext(context, snapshot),
    new Error('Renderer build received inconsistent Next standalone manifest paths')
  )
})

test('should reject renderer builds without the metadata-selected standalone server', async () => {
  const { context } = await createRendererArtifactFixture()

  await xfs.mkdirPromise(context.standaloneCwd, { recursive: true })

  await assert.rejects(
    async () => assertRendererBuildStandaloneOutput(context),
    new Error('Renderer build metadata does not reference a runnable Next standalone server')
  )
})

test('should preserve the full Next standalone root and launch its nested CommonJS server', async () => {
  const { context, rendererCwd } = await createRendererArtifactFixture(true)

  await xfs.mkdirPromise(ppath.join(context.standaloneCwd, 'node_modules/next'), {
    recursive: true,
  })
  await xfs.mkdirPromise(context.standaloneAppCwd, { recursive: true })
  await xfs.writeFilePromise(
    ppath.join(context.standaloneCwd, 'node_modules/next/package.json'),
    '{}'
  )
  await xfs.writeFilePromise(ppath.join(context.standaloneAppCwd, 'server.js'), 'server')

  await assertRendererBuildStandaloneOutput(context)
  await copyRendererBuildStandaloneFiles(context)
  await materializeRendererBuildEntrypoint(context)

  assert.equal(
    await xfs.existsPromise(ppath.join(rendererCwd, 'dist/node_modules/next/package.json')),
    true
  )
  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'server.cjs')), true)
  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'server.js')), false)
  assert.equal(
    (await xfs.readFilePromise(ppath.join(context.distCwd, 'index.cjs'))).toString(),
    'import("./apps/web/src/server.cjs").catch((error) => {\n  console.error(error)\n  process.exitCode = 1\n})\n'
  )
})

test('should preserve Next module classification for a standalone ESM server', async () => {
  const { context } = await createRendererArtifactFixture()

  await xfs.mkdirPromise(context.standaloneAppCwd, { recursive: true })
  await xfs.writeJsonPromise(ppath.join(context.standaloneAppCwd, 'package.json'), {
    type: 'module',
  })
  await xfs.writeFilePromise(ppath.join(context.standaloneAppCwd, 'server.js'), 'export {}')

  await copyRendererBuildStandaloneFiles(context)
  await materializeRendererBuildEntrypoint(context)

  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'package.json')), true)
  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'server.js')), true)
  assert.equal(
    (await xfs.readFilePromise(ppath.join(context.distCwd, 'index.cjs'))).toString(),
    'import("./src/server.js").catch((error) => {\n  console.error(error)\n  process.exitCode = 1\n})\n'
  )
})

test('should copy Next static and edge assets beside the nested standalone server', async () => {
  const { context } = await createRendererArtifactFixture(true)

  await xfs.mkdirPromise(ppath.join(context.nextOutputCwd, 'static/chunks'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(context.nextOutputCwd, 'server/edge-chunks'), {
    recursive: true,
  })
  await xfs.writeFilePromise(ppath.join(context.nextOutputCwd, 'static/chunks/app.js'), '')
  await xfs.writeFilePromise(ppath.join(context.nextOutputCwd, 'server/edge-chunks/edge.js'), '')

  await copyRendererBuildStaticAssets(context)
  await copyRendererBuildEdgeChunks(context)

  assert.equal(
    await xfs.existsPromise(ppath.join(context.artifactAppCwd, '.next/static/chunks/app.js')),
    true
  )
  assert.equal(
    await xfs.existsPromise(ppath.join(context.artifactAppCwd, '.next/server/edge-chunks/edge.js')),
    true
  )
})

test('should copy renderer public assets beside the nested standalone server', async () => {
  const { context, rendererCwd } = await createRendererArtifactFixture(true)

  await xfs.mkdirPromise(ppath.join(rendererCwd, 'public/organization-logos'), {
    recursive: true,
  })
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/Bg.png'), '')
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/organization-logos/atlantis.png'), '')

  await copyRendererBuildPublicAssets(context)

  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'public/Bg.png')), true)
  assert.equal(
    await xfs.existsPromise(
      ppath.join(context.artifactAppCwd, 'public/organization-logos/atlantis.png')
    ),
    true
  )
})

test('should prefer renderer source public assets over root public assets', async () => {
  const { context, rendererCwd } = await createRendererArtifactFixture()

  await xfs.mkdirPromise(ppath.join(rendererCwd, 'public'), { recursive: true })
  await xfs.mkdirPromise(ppath.join(rendererCwd, 'src/public'), { recursive: true })
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/Bg.png'), 'root')
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'public/root-only.png'), '')
  await xfs.writeFilePromise(ppath.join(rendererCwd, 'src/public/Bg.png'), 'source')

  await copyRendererBuildPublicAssets(context)

  assert.equal(
    (await xfs.readFilePromise(ppath.join(context.artifactAppCwd, 'public/Bg.png'))).toString(),
    'source'
  )
  assert.equal(
    await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'public/root-only.png')),
    false
  )
})

test('should ignore missing renderer public assets', async () => {
  const { context } = await createRendererArtifactFixture()

  await copyRendererBuildPublicAssets(context)

  assert.equal(await xfs.existsPromise(ppath.join(context.artifactAppCwd, 'public')), false)
})
