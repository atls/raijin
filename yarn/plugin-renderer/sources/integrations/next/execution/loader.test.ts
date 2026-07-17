import assert                                             from 'node:assert/strict'
import test                                               from 'node:test'

import { NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE } from './loader.js'
import { createNextRendererLoaderSource }                 from './loader.js'

interface NextLoader {
  load: (
    url: string,
    context: Record<string, unknown>,
    nextLoad: (url: string, context: Record<string, unknown>) => Promise<{ source: string }>
  ) => Promise<{ source: string }>
}

const loadNextSource = async (url: string, source: string): Promise<string> => {
  const loader = (await import(
    `data:text/javascript,${encodeURIComponent(NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE)}`
  )) as NextLoader
  const result = await loader.load(url, {}, async () => ({ source }))

  return result.source
}

test('should create a combined Next loader with PnP delegation', () => {
  const source = createNextRendererLoaderSource('file:///.pnp.loader.mjs')

  assert.match(source, /import \* as pnpLoader from "file:\/\/\/\.pnp\.loader\.mjs"/)
  assert.match(source, /pnpLoader.resolve/)
  assert.match(source, /pnpLoader.load/)
})

test('should patch Next compiled conf require cache deletion', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/compiled/conf/index.js',
    'before delete require.cache[__filename] after'
  )

  assert.equal(source, 'before if (require.cache) delete require.cache[__filename] after')
})

test('should leave Next config values to the adapter boundary', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/server/config.js',
    [
      'const result = {',
      '        ..._configshared.defaultConfig,',
      '        ...config,',
      '        experimental: {',
      '            ..._configshared.defaultConfig.experimental,',
      '            ...config.experimental',
      '        }',
      '    };',
    ].join('\n')
  )

  assert.equal(source.includes('result.experimental.extensionAlias ??= {'), false)
  assert.equal(source.includes('RAIJIN_RENDERER_OUTPUT'), false)
  assert.equal(source.includes('RAIJIN_RENDERER_WORKSPACE_CWD'), false)
})

test('should patch Next config require hook extensions access', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/build/next-config-ts/require-hook.js',
    "const oldJSHook = require.extensions['.js']; require.extensions['.js'] = hook; delete require.extensions[ext];"
  )

  assert.equal(
    source,
    "const requireExtensions = require.extensions || _nodemodule.default._extensions;\nconst oldJSHook = requireExtensions['.js']; requireExtensions['.js'] = hook; delete requireExtensions[ext];"
  )
})

test('should patch the Next manifest loader to read JSON manifests from disk', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/server/route-matcher-providers/helpers/manifest-loaders/node-manifest-loader.js',
    [
      'const _path = /*#__PURE__*/ _interop_require_default(require("../../../../shared/lib/isomorphic/path"));',
      'static require(id) {',
      '        try {',
      '            return require(id);',
      '        } catch  {',
      '            return null;',
      '        }',
      '    }',
    ].join('\n')
  )

  assert.equal(
    source.includes('const _fs = /*#__PURE__*/ _interop_require_default(require("node:fs"));'),
    true
  )
  assert.equal(source.includes("return JSON.parse(_fs.default.readFileSync(id, 'utf8'));"), true)
  assert.equal(source.includes('return require(id);'), true)
})

test('should patch Next compiled webpack require cache access', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/compiled/webpack/bundle5.js',
    'before const $=require.cache[ct]; after'
  )

  assert.equal(source, 'before const $=require.cache?.[ct]; after')
})

test('should patch Next webpack config node protocol handling', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/build/webpack-config.js',
    '(isClient || isEdgeServer) && new bundler.ProvidePlugin({'
  )

  assert.equal(source.includes('new bundler.NormalModuleReplacementPlugin(/^node:/'), true)
  assert.equal(source.includes("resource.request.replace(/^node:/, '')"), true)
  assert.equal(source.includes('new bundler.ProvidePlugin'), true)
})

test('should leave Next webpack extension aliases to the adapter boundary', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/build/webpack-config.js',
    'extensionAlias: config.experimental.extensionAlias,'
  )

  assert.equal(source, 'extensionAlias: config.experimental.extensionAlias,')
})

test('should leave unrelated Next SWC source unchanged', async () => {
  const source = await loadNextSource(
    'file:///repo/.yarn/cache/next.zip/node_modules/next/dist/esm/build/swc/index.js',
    'const nativeBindingsDirectory = path.join(path.dirname(require.resolve("next/package.json")), "next-swc-fallback");'
  )

  assert.equal(
    source,
    'const nativeBindingsDirectory = path.join(path.dirname(require.resolve("next/package.json")), "next-swc-fallback");'
  )
})
