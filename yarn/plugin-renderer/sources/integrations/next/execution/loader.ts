import type { PortablePath }              from '@yarnpkg/fslib'

import { pathToFileURL }                  from 'node:url'

import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_PATH }        from './loader.constants.js'
import { NEXT_COMPILED_WEBPACK_PATH }     from './loader.constants.js'
import { NEXT_CONFIG_REQUIRE_HOOK_PATH }  from './loader.constants.js'
import { NEXT_NODE_MANIFEST_LOADER_PATH } from './loader.constants.js'
import { NEXT_PACKAGE_PATH }              from './loader.constants.js'
import { NEXT_REQUIRE_CACHE_PATH }        from './loader.constants.js'
import { NEXT_SERVER_CONFIG_PATH }        from './loader.constants.js'
import { NEXT_WEBPACK_CONFIG_PATH }       from './loader.constants.js'

const LOADER_FILENAME = 'next-compiled-conf-require-cache-loader.mjs'

export const NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE = `
const pnpLoader = {}

const NEXT_PACKAGE_PATH = ${JSON.stringify(NEXT_PACKAGE_PATH)}
const NEXT_COMPILED_CONF_PATH = ${JSON.stringify(NEXT_COMPILED_CONF_PATH)}
const NEXT_CONFIG_REQUIRE_HOOK_PATH = ${JSON.stringify(NEXT_CONFIG_REQUIRE_HOOK_PATH)}
const NEXT_NODE_MANIFEST_LOADER_PATH = ${JSON.stringify(NEXT_NODE_MANIFEST_LOADER_PATH)}
const NEXT_REQUIRE_CACHE_PATH = ${JSON.stringify(NEXT_REQUIRE_CACHE_PATH)}
const NEXT_SERVER_CONFIG_PATH = ${JSON.stringify(NEXT_SERVER_CONFIG_PATH)}
const NEXT_COMPILED_WEBPACK_PATH = ${JSON.stringify(NEXT_COMPILED_WEBPACK_PATH)}
const NEXT_WEBPACK_CONFIG_PATH = ${JSON.stringify(NEXT_WEBPACK_CONFIG_PATH)}
const REQUIRE_CACHE_NEEDLE = 'delete require.cache[__filename]'
const REQUIRE_CACHE_REPLACEMENT = 'if (require.cache) delete require.cache[__filename]'
const REQUIRE_CACHE_FILE_NEEDLE = 'const mod = require.cache[filePath];'
const REQUIRE_CACHE_FILE_REPLACEMENT = 'const mod = require.cache?.[filePath];'
const REQUIRE_CACHE_VALUES_NEEDLE = 'const modules = Object.values(require.cache);'
const REQUIRE_CACHE_VALUES_REPLACEMENT = 'const modules = Object.values(require.cache || {});'
const REQUIRE_CACHE_DELETE_FILE_NEEDLE = 'delete require.cache[filePath];'
const REQUIRE_CACHE_DELETE_FILE_REPLACEMENT = 'if (require.cache) delete require.cache[filePath];'
const NODE_MANIFEST_LOADER_PATH_NEEDLE =
  'const _path = /*#__PURE__*/ _interop_require_default(require("../../../../shared/lib/isomorphic/path"));'
const NODE_MANIFEST_LOADER_PATH_REPLACEMENT = [
  NODE_MANIFEST_LOADER_PATH_NEEDLE,
  'const _fs = /*#__PURE__*/ _interop_require_default(require("node:fs"));',
].join('\\n')
const NODE_MANIFEST_LOADER_REQUIRE_NEEDLE = [
  'static require(id) {',
  '        try {',
  '            return require(id);',
  '        } catch  {',
  '            return null;',
  '        }',
  '    }',
].join('\\n')
const NODE_MANIFEST_LOADER_REQUIRE_REPLACEMENT = [
  'static require(id) {',
  '        try {',
  "            if (id.endsWith('.json')) {",
  "                return JSON.parse(_fs.default.readFileSync(id, 'utf8'));",
  '            }',
  '',
  '            return require(id);',
  '        } catch  {',
  '            return null;',
  '        }',
  '    }',
].join('\\n')
const WEBPACK_REQUIRE_CACHE_NEEDLE = 'const $=require.cache[ct];'
const WEBPACK_REQUIRE_CACHE_REPLACEMENT = 'const $=require.cache?.[ct];'
const WEBPACK_NODE_PROTOCOL_PLUGIN_NEEDLE =
  '(isClient || isEdgeServer) && new bundler.ProvidePlugin({'
const WEBPACK_NODE_PROTOCOL_PLUGIN_REPLACEMENT = [
  '(isClient || isEdgeServer) && new bundler.NormalModuleReplacementPlugin(/^node:/, function(resource) {',
  "                resource.request = resource.request.replace(/^node:/, '');",
  '            }),',
  WEBPACK_NODE_PROTOCOL_PLUGIN_NEEDLE,
].join('\\n            ')
const REQUIRE_EXTENSIONS_NEEDLE = "const oldJSHook = requireExtensions['.js'];"
const REQUIRE_EXTENSIONS_REPLACEMENT = "const requireExtensions = require.extensions || _nodemodule.default._extensions;\\nconst oldJSHook = requireExtensions['.js'];"

const isNextSource = (url, path) =>
  url.includes(NEXT_PACKAGE_PATH) && url.includes(path)

const isNextCompiledConf = (url) => isNextSource(url, NEXT_COMPILED_CONF_PATH)

const isNextConfigRequireHook = (url) => isNextSource(url, NEXT_CONFIG_REQUIRE_HOOK_PATH)

const isNextNodeManifestLoader = (url) => isNextSource(url, NEXT_NODE_MANIFEST_LOADER_PATH)

const isNextRequireCache = (url) => isNextSource(url, NEXT_REQUIRE_CACHE_PATH)

const isNextServerConfig = (url) => isNextSource(url, NEXT_SERVER_CONFIG_PATH)

const isNextCompiledWebpack = (url) => isNextSource(url, NEXT_COMPILED_WEBPACK_PATH)

const isNextWebpackConfig = (url) => isNextSource(url, NEXT_WEBPACK_CONFIG_PATH)

const isPatchableNextSource = (url) =>
  isNextCompiledConf(url) ||
  isNextConfigRequireHook(url) ||
  isNextNodeManifestLoader(url) ||
  isNextRequireCache(url) ||
  isNextServerConfig(url) ||
  isNextCompiledWebpack(url) ||
  isNextWebpackConfig(url)

const patchNextCompiledConfSource = (source) =>
  source.split(REQUIRE_CACHE_NEEDLE).join(REQUIRE_CACHE_REPLACEMENT)

const patchNextConfigRequireHookSource = (source) =>
  source
    .split('require.extensions')
    .join('requireExtensions')
    .split(REQUIRE_EXTENSIONS_NEEDLE)
    .join(REQUIRE_EXTENSIONS_REPLACEMENT)

const patchNextNodeManifestLoaderSource = (source) =>
  source
    .split(NODE_MANIFEST_LOADER_PATH_NEEDLE)
    .join(NODE_MANIFEST_LOADER_PATH_REPLACEMENT)
    .split(NODE_MANIFEST_LOADER_REQUIRE_NEEDLE)
    .join(NODE_MANIFEST_LOADER_REQUIRE_REPLACEMENT)

const patchNextRequireCacheSource = (source) =>
  source
    .split(REQUIRE_CACHE_FILE_NEEDLE)
    .join(REQUIRE_CACHE_FILE_REPLACEMENT)
    .split(REQUIRE_CACHE_VALUES_NEEDLE)
    .join(REQUIRE_CACHE_VALUES_REPLACEMENT)
    .split(REQUIRE_CACHE_DELETE_FILE_NEEDLE)
    .join(REQUIRE_CACHE_DELETE_FILE_REPLACEMENT)

const patchNextCompiledWebpackSource = (source) =>
  source
    .split(WEBPACK_REQUIRE_CACHE_NEEDLE)
    .join(WEBPACK_REQUIRE_CACHE_REPLACEMENT)

const patchNextWebpackConfigSource = (source) =>
  source
    .split(WEBPACK_NODE_PROTOCOL_PLUGIN_NEEDLE)
    .join(WEBPACK_NODE_PROTOCOL_PLUGIN_REPLACEMENT)

const transformNextSource = (url, source) => {
  if (isNextCompiledConf(url)) {
    return patchNextCompiledConfSource(source)
  }

  if (isNextConfigRequireHook(url)) {
    return patchNextConfigRequireHookSource(source)
  }

  if (isNextNodeManifestLoader(url)) {
    return patchNextNodeManifestLoaderSource(source)
  }

  if (isNextRequireCache(url)) {
    return patchNextRequireCacheSource(source)
  }

  if (isNextServerConfig(url)) {
    return patchNextCompiledConfSource(source)
  }

  if (isNextCompiledWebpack(url)) {
    return patchNextCompiledWebpackSource(source)
  }

  if (isNextWebpackConfig(url)) {
    return patchNextWebpackConfigSource(source)
  }

  return source
}

export async function resolve(specifier, context, nextResolve) {
  if (typeof pnpLoader.resolve === 'function') {
    return pnpLoader.resolve(specifier, context, nextResolve)
  }

  return nextResolve(specifier, context)
}

export async function load(url, context, nextLoad) {
  const result = typeof pnpLoader.load === 'function'
    ? await pnpLoader.load(url, context, nextLoad)
    : await nextLoad(url, context)

  if (!isPatchableNextSource(url)) {
    return result
  }

  if (typeof result.source === 'string') {
    return {
      ...result,
      source: transformNextSource(url, result.source),
    }
  }

  if (result.source instanceof Uint8Array) {
    return {
      ...result,
      source: transformNextSource(url, Buffer.from(result.source).toString('utf8')),
    }
  }

  return result
}
`.trimStart()

export const createNextRendererLoaderSource = (pnpLoaderUrl?: string): string => {
  if (!pnpLoaderUrl) {
    return NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE
  }

  return NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE.replace(
    'const pnpLoader = {}',
    `import * as pnpLoader from ${JSON.stringify(pnpLoaderUrl)}`
  )
}

export const materializeNextLoader = async (
  binFolder: PortablePath,
  pnpLoader?: string
): Promise<string> => {
  const loaderPath = ppath.join(binFolder, LOADER_FILENAME)

  await xfs.writeFilePromise(loaderPath, createNextRendererLoaderSource(pnpLoader))

  return pathToFileURL(npath.fromPortablePath(loaderPath)).href
}
