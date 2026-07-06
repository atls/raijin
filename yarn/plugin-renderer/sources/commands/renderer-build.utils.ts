import type { Locator }                   from '@yarnpkg/core'
import type { Filename }                  from '@yarnpkg/fslib'
import type { PortablePath }              from '@yarnpkg/fslib'

import { pathToFileURL }                  from 'node:url'

import { structUtils }                    from '@yarnpkg/core'
import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_PATH }        from './renderer-build.constants.js'
import { NEXT_COMPILED_WEBPACK_PATH }     from './renderer-build.constants.js'
import { NEXT_CONFIG_REQUIRE_HOOK_PATH }  from './renderer-build.constants.js'
import { NEXT_NODE_MANIFEST_LOADER_PATH } from './renderer-build.constants.js'
import { NEXT_PACKAGE_PATH }              from './renderer-build.constants.js'
import { NEXT_REQUIRE_CACHE_PATH }        from './renderer-build.constants.js'
import { NEXT_SERVER_CONFIG_PATH }        from './renderer-build.constants.js'
import { NEXT_WEBPACK_CONFIG_PATH }       from './renderer-build.constants.js'

const NEXT_COMPILED_CONF_LOADER_FILENAME = 'next-compiled-conf-require-cache-loader.mjs'
const NODE_LOADER_OPTIONS = new Set(['--experimental-loader', '--loader'])
const RAIJIN_NODE_LOADER = 'RAIJIN_NODE_LOADER'
const RAIJIN_RENDERER_OUTPUT = 'RAIJIN_RENDERER_OUTPUT'
const RAIJIN_RENDERER_WORKSPACE_CWD = 'RAIJIN_RENDERER_WORKSPACE_CWD'
const DIST_DIR = 'dist' as Filename
const NEXT_DIR = '.next' as Filename
const PACKAGE_MANIFEST = 'package.json' as Filename
const PNP_ESM_LOADER = '.pnp.loader.mjs' as Filename
const PUBLIC_DIR = 'public' as Filename
const SRC_DIR = 'src' as Filename
const NPM_PROTOCOL = 'npm:'
const NPM_REFERENCE_PATTERN = /(?:^|@)npm:([^#@]+)/
const NEXT_MAJOR_WEBPACK_BY_DEFAULT = 16
type RendererBuildPathSegments = ReadonlyArray<Filename>
export type RendererBuildContext = {
  appCwd: PortablePath
  distCwd: PortablePath
  nextOutputCwd: PortablePath
  rendererCwd: PortablePath
}

const RENDERER_BUILD_STALE_ARTIFACT_PATHS: ReadonlyArray<RendererBuildPathSegments> = [
  [DIST_DIR],
  [NEXT_DIR],
]
const RENDERER_BUILD_WORKSPACE_MANIFEST_PATHS: ReadonlyArray<RendererBuildPathSegments> = [
  [DIST_DIR, PACKAGE_MANIFEST],
  [NEXT_DIR, PACKAGE_MANIFEST],
]
const RENDERER_BUILD_SOURCE_ARTIFACT_PATHS: ReadonlyArray<RendererBuildPathSegments> = [[NEXT_DIR]]

const isTemporaryRendererSourceManifest = (manifest: unknown): boolean => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return false
  }

  const entries = Object.entries(manifest)

  return entries.length === 1 && entries[0][0] === 'type' && entries[0][1] === 'module'
}

const findRendererBuildSourceCwd = (cwd: PortablePath): PortablePath | undefined => {
  let current = cwd

  while (current !== ppath.dirname(current)) {
    if (ppath.basename(current) === SRC_DIR) {
      return current
    }

    current = ppath.dirname(current)
  }

  return undefined
}

const isPnpNodeLoader = (value: string | undefined): boolean =>
  value?.includes('.pnp.loader.mjs') ?? false

export const NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE = `
const pnpLoader = {}

const RAIJIN_RENDERER_WORKSPACE_CWD = ${JSON.stringify(RAIJIN_RENDERER_WORKSPACE_CWD)}
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
const NEXT_CONFIG_RESULT_NEEDLE = [
  'const result = {',
  '        ..._configshared.defaultConfig,',
  '        ...config,',
  '        experimental: {',
  '            ..._configshared.defaultConfig.experimental,',
  '            ...config.experimental',
  '        }',
  '    };',
].join('\\n')
const NEXT_CONFIG_RESULT_REPLACEMENT = [
  NEXT_CONFIG_RESULT_NEEDLE,
  '    result.experimental.extensionAlias ??= {',
  "        '.js': ['.js', '.tsx', '.ts'],",
  "        '.jsx': ['.jsx', '.tsx', '.ts'],",
  "        '.mjs': ['.mjs', '.mts'],",
  '    };',
  '    result.output ??= process.env["RAIJIN_RENDERER_OUTPUT"];',
  '    result.turbopack ??= {};',
  '    result.turbopack.root ??= process.env["RAIJIN_RENDERER_WORKSPACE_CWD"];',
  '    const raijinWebpack = result.webpack;',
  '    result.webpack = (webpackConfig, context) => {',
  '        webpackConfig.resolve ??= {};',
  '        webpackConfig.resolve.extensionAlias ??= result.experimental.extensionAlias;',
  '',
  "        if (typeof raijinWebpack === 'function') {",
  '            return raijinWebpack(webpackConfig, context);',
  '        }',
  '',
  '        return webpackConfig;',
  '    };',
].join('\\n')
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
const WEBPACK_EXTENSION_ALIAS_NEEDLE = 'extensionAlias: config.experimental.extensionAlias,'
const WEBPACK_EXTENSION_ALIAS_REPLACEMENT = [
  'extensionAlias: config.experimental.extensionAlias ?? {',
  "            '.js': ['.js', '.tsx', '.ts'],",
  "            '.jsx': ['.jsx', '.tsx', '.ts'],",
  "            '.mjs': ['.mjs', '.mts'],",
  '        },',
].join('\\n        ')
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
  source
    .split(REQUIRE_CACHE_NEEDLE)
    .join(REQUIRE_CACHE_REPLACEMENT)
    .split(NEXT_CONFIG_RESULT_NEEDLE)
    .join(NEXT_CONFIG_RESULT_REPLACEMENT)

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
    .split(WEBPACK_EXTENSION_ALIAS_NEEDLE)
    .join(WEBPACK_EXTENSION_ALIAS_REPLACEMENT)

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

const parseMajorVersion = (version: string | undefined): number | null => {
  if (!version) {
    return null
  }

  const [major] = version.split('.')
  const parsed = Number.parseInt(major, 10)

  return Number.isNaN(parsed) ? null : parsed
}

const resolveRendererBuildPath = (
  cwd: PortablePath,
  segments: RendererBuildPathSegments
): PortablePath => ppath.join(cwd, ...segments)

export const createRendererBuildContext = (rendererCwd: PortablePath): RendererBuildContext => {
  const appCwd = ppath.join(rendererCwd, SRC_DIR)

  return {
    appCwd,
    distCwd: ppath.join(rendererCwd, DIST_DIR),
    nextOutputCwd: ppath.join(appCwd, NEXT_DIR),
    rendererCwd,
  }
}

const removeRendererBuildPaths = async (
  cwd: PortablePath,
  paths: ReadonlyArray<RendererBuildPathSegments>
): Promise<void> => {
  await Promise.all(
    paths.map(async (segments) => {
      const target = resolveRendererBuildPath(cwd, segments)

      if (await xfs.existsPromise(target)) {
        await xfs.removePromise(target)
      }
    })
  )
}

const cleanupRendererBuildSourceManifest = async (sourceCwd: PortablePath): Promise<void> => {
  const manifestPath = ppath.join(sourceCwd, PACKAGE_MANIFEST)

  if (!(await xfs.existsPromise(manifestPath))) {
    return
  }

  const manifest = (await xfs.readJsonPromise(manifestPath)) as unknown

  if (isTemporaryRendererSourceManifest(manifest)) {
    await xfs.removePromise(manifestPath)
  }
}

export const cleanupRendererBuildStaleArtifacts = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_STALE_ARTIFACT_PATHS)
  await cleanupRendererBuildSourceManifest(ppath.join(cwd, SRC_DIR))
}

export const cleanupRendererBuildDiscoveryArtifacts = async (cwd: PortablePath): Promise<void> => {
  const sourceCwd = findRendererBuildSourceCwd(cwd)

  if (!sourceCwd) {
    return
  }

  await cleanupRendererBuildSourceManifest(sourceCwd)
}

export const cleanupRendererBuildWorkspaceManifests = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_WORKSPACE_MANIFEST_PATHS)
}

export const cleanupRendererBuildSourceArtifacts = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_SOURCE_ARTIFACT_PATHS)
}

export const copyRendererBuildPublicAssets = async (cwd: PortablePath): Promise<void> => {
  const source = (await xfs.existsPromise(ppath.join(cwd, PUBLIC_DIR)))
    ? ppath.join(cwd, PUBLIC_DIR)
    : ppath.join(cwd, SRC_DIR, PUBLIC_DIR)

  if (!(await xfs.existsPromise(source))) {
    return
  }

  await xfs.copyPromise(ppath.join(cwd, DIST_DIR, PUBLIC_DIR), source)
}

export const resolveRendererBuildStandaloneWorkspaceCwd = (
  projectCwd: PortablePath,
  rendererCwd: PortablePath
): PortablePath => {
  const relativeRendererCwd = ppath.relative(projectCwd, rendererCwd)
  const { nextOutputCwd } = createRendererBuildContext(rendererCwd)
  const standaloneCwd = ppath.join(nextOutputCwd, 'standalone' as Filename)

  if (relativeRendererCwd === '.') {
    return standaloneCwd
  }

  return ppath.join(standaloneCwd, relativeRendererCwd)
}

export const resolveRendererBuildStandaloneSourceCwd = async (
  projectCwd: PortablePath,
  rendererCwd: PortablePath
): Promise<PortablePath> => {
  const { nextOutputCwd } = createRendererBuildContext(rendererCwd)
  const standaloneCwd = ppath.join(nextOutputCwd, 'standalone' as Filename)
  const workspaceStandaloneCwd = resolveRendererBuildStandaloneWorkspaceCwd(projectCwd, rendererCwd)

  if (await xfs.existsPromise(workspaceStandaloneCwd)) {
    return workspaceStandaloneCwd
  }

  return standaloneCwd
}

export const createRendererBuildEnv = (
  env: NodeJS.ProcessEnv,
  nextCompiledConfRequireCacheLoader: string,
  rendererCwd: PortablePath,
  options: { output?: string } = {}
): NodeJS.ProcessEnv => ({
  ...env,
  NEXT_TELEMETRY_DISABLED: '1',
  [RAIJIN_RENDERER_WORKSPACE_CWD]: npath.fromPortablePath(rendererCwd),
  [RAIJIN_NODE_LOADER]: nextCompiledConfRequireCacheLoader,
  ...(options.output ? { [RAIJIN_RENDERER_OUTPUT]: options.output } : {}),
})

export const extractNodeLoaderOption = (
  nodeOptions: string | undefined
): { nodeOptions: string | undefined; loader: string | undefined } => {
  if (!nodeOptions) {
    return {
      nodeOptions,
      loader: undefined,
    }
  }

  const tokens = nodeOptions.split(/\s+/).filter(Boolean)

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    const separatorIndex = token.indexOf('=')
    const hasInlineValue = separatorIndex !== -1
    const option = hasInlineValue ? token.slice(0, separatorIndex) : token

    if (!NODE_LOADER_OPTIONS.has(option)) {
      continue
    }

    const loader = hasInlineValue ? token.slice(separatorIndex + 1) : tokens[index + 1]

    if (!isPnpNodeLoader(loader)) {
      continue
    }

    const tokenCount = hasInlineValue ? 1 : 2
    const nextTokens = [...tokens.slice(0, index), ...tokens.slice(index + tokenCount)]

    return {
      nodeOptions: nextTokens.length > 0 ? nextTokens.join(' ') : undefined,
      loader,
    }
  }

  return {
    nodeOptions,
    loader: undefined,
  }
}

export const resolveRendererBuildPnpLoader = async (
  projectCwd: PortablePath,
  nodeOptions: string | undefined
): Promise<string | undefined> => {
  const pnpLoaderPath = ppath.join(projectCwd, PNP_ESM_LOADER)

  if (await xfs.existsPromise(pnpLoaderPath)) {
    return pathToFileURL(npath.fromPortablePath(pnpLoaderPath)).href
  }

  return extractNodeLoaderOption(nodeOptions).loader
}

export const assertSupportedRendererNextVersion = (nextVersion: string | undefined): void => {
  const nextMajor = parseMajorVersion(nextVersion)

  if (nextMajor !== null && nextMajor < NEXT_MAJOR_WEBPACK_BY_DEFAULT) {
    throw new Error(`Renderer build requires Next.js 16 or newer, found ${nextVersion}`)
  }
}

export const normalizeNextPackageVersion = (reference: string): string => {
  if (reference.startsWith(NPM_PROTOCOL)) {
    return reference.slice(NPM_PROTOCOL.length)
  }

  const decodedReference = decodeURIComponent(reference)
  const npmReference = decodedReference.match(NPM_REFERENCE_PATTERN)

  return npmReference?.[1] ?? reference
}

export const resolveNextPackageVersion = (locator: Locator): string => {
  const nextLocator = structUtils.isVirtualLocator(locator)
    ? structUtils.devirtualizeLocator(locator)
    : locator

  return normalizeNextPackageVersion(nextLocator.reference)
}

export const shouldUseWebpackRendererRoute = (nextVersion: string | undefined): boolean => {
  const nextMajor = parseMajorVersion(nextVersion)

  return nextMajor !== null && nextMajor >= NEXT_MAJOR_WEBPACK_BY_DEFAULT
}

export const createRendererBuildArgs = (
  nextVersion: string | undefined,
  nextBin = 'next'
): Array<string> => {
  const args = ['node', nextBin, 'build']

  assertSupportedRendererNextVersion(nextVersion)

  // TODO(atls/raijin#629): replace the explicit webpack renderer route with the
  // planned Turbopack contract once the Raijin v3 Next build stream owns it.
  if (shouldUseWebpackRendererRoute(nextVersion)) {
    args.push('--webpack')
  }

  args.push(SRC_DIR)

  return args
}

export const assertRendererBuildExitCode = (code: number): void => {
  if (code !== 0) {
    throw new Error(`Renderer build failed with exit code ${code}`)
  }
}

export const materializeNextCompiledConfRequireCacheLoader = async (
  binFolder: PortablePath,
  pnpLoader?: string
): Promise<string> => {
  const loaderPath = ppath.join(binFolder, NEXT_COMPILED_CONF_LOADER_FILENAME)

  await xfs.writeFilePromise(loaderPath, createNextRendererLoaderSource(pnpLoader))

  return pathToFileURL(npath.fromPortablePath(loaderPath)).href
}
