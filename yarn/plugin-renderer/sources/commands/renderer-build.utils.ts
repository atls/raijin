import type { Locator }                  from '@yarnpkg/core'
import type { Filename }                 from '@yarnpkg/fslib'
import type { PortablePath }             from '@yarnpkg/fslib'

import { pathToFileURL }                 from 'node:url'

import { structUtils }                   from '@yarnpkg/core'
import { npath }                         from '@yarnpkg/fslib'
import { ppath }                         from '@yarnpkg/fslib'
import { xfs }                           from '@yarnpkg/fslib'

import { NEXT_COMPILED_CONF_PATH }       from './renderer-build.constants.js'
import { NEXT_COMPILED_WEBPACK_PATH }    from './renderer-build.constants.js'
import { NEXT_CONFIG_REQUIRE_HOOK_PATH } from './renderer-build.constants.js'
import { NEXT_PACKAGE_PATH }             from './renderer-build.constants.js'
import { NEXT_REQUIRE_CACHE_PATH }       from './renderer-build.constants.js'
import { NEXT_WEBPACK_CONFIG_PATH }      from './renderer-build.constants.js'

const NEXT_COMPILED_CONF_LOADER_FILENAME = 'next-compiled-conf-require-cache-loader.mjs'
const NODE_LOADER_OPTIONS = new Set(['--experimental-loader', '--loader'])
const RAIJIN_NODE_LOADER = 'RAIJIN_NODE_LOADER'
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

const RENDERER_BUILD_STALE_ARTIFACT_PATHS: ReadonlyArray<RendererBuildPathSegments> = [
  [DIST_DIR],
  [SRC_DIR, NEXT_DIR],
  // Renderer source is not a workspace boundary; this temporary manifest poisons Yarn discovery.
  [SRC_DIR, PACKAGE_MANIFEST],
]
const RENDERER_BUILD_WORKSPACE_MANIFEST_PATHS: ReadonlyArray<RendererBuildPathSegments> = [
  [DIST_DIR, PACKAGE_MANIFEST],
  [SRC_DIR, NEXT_DIR, PACKAGE_MANIFEST],
]
const RENDERER_BUILD_SOURCE_ARTIFACT_PATHS: ReadonlyArray<RendererBuildPathSegments> = [
  [SRC_DIR, NEXT_DIR],
]

const isPnpNodeLoader = (value: string | undefined): boolean =>
  value?.includes('.pnp.loader.mjs') ?? false

export const NEXT_COMPILED_CONF_REQUIRE_CACHE_LOADER_SOURCE = `
const pnpLoader = {}

const NEXT_PACKAGE_PATH = ${JSON.stringify(NEXT_PACKAGE_PATH)}
const NEXT_COMPILED_CONF_PATH = ${JSON.stringify(NEXT_COMPILED_CONF_PATH)}
const NEXT_CONFIG_REQUIRE_HOOK_PATH = ${JSON.stringify(NEXT_CONFIG_REQUIRE_HOOK_PATH)}
const NEXT_REQUIRE_CACHE_PATH = ${JSON.stringify(NEXT_REQUIRE_CACHE_PATH)}
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

const isNextRequireCache = (url) => isNextSource(url, NEXT_REQUIRE_CACHE_PATH)

const isNextCompiledWebpack = (url) => isNextSource(url, NEXT_COMPILED_WEBPACK_PATH)

const isNextWebpackConfig = (url) => isNextSource(url, NEXT_WEBPACK_CONFIG_PATH)

const isPatchableNextSource = (url) =>
  isNextCompiledConf(url) ||
  isNextConfigRequireHook(url) ||
  isNextRequireCache(url) ||
  isNextCompiledWebpack(url) ||
  isNextWebpackConfig(url)

const patchNextCompiledConfSource = (source) =>
  source
    .split(REQUIRE_CACHE_NEEDLE)
    .join(REQUIRE_CACHE_REPLACEMENT)

const patchNextConfigRequireHookSource = (source) =>
  source
    .split('require.extensions')
    .join('requireExtensions')
    .split(REQUIRE_EXTENSIONS_NEEDLE)
    .join(REQUIRE_EXTENSIONS_REPLACEMENT)

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

  if (isNextRequireCache(url)) {
    return patchNextRequireCacheSource(source)
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

export const cleanupRendererBuildStaleArtifacts = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_STALE_ARTIFACT_PATHS)
}

export const cleanupRendererBuildWorkspaceManifests = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_WORKSPACE_MANIFEST_PATHS)
}

export const cleanupRendererBuildSourceArtifacts = async (cwd: PortablePath): Promise<void> => {
  await removeRendererBuildPaths(cwd, RENDERER_BUILD_SOURCE_ARTIFACT_PATHS)
}

export const copyRendererBuildPublicAssets = async (cwd: PortablePath): Promise<void> => {
  const source = ppath.join(cwd, SRC_DIR, PUBLIC_DIR)

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
  const standaloneCwd = ppath.join(rendererCwd, SRC_DIR, NEXT_DIR, 'standalone' as Filename)

  if (relativeRendererCwd === '.') {
    return standaloneCwd
  }

  return ppath.join(standaloneCwd, relativeRendererCwd)
}

export const createRendererBuildEnv = (
  env: NodeJS.ProcessEnv,
  nextCompiledConfRequireCacheLoader: string
): NodeJS.ProcessEnv => ({
  ...env,
  NEXT_TELEMETRY_DISABLED: '1',
  [RAIJIN_NODE_LOADER]: nextCompiledConfRequireCacheLoader,
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

export const createRendererBuildArgs = (
  nextVersion: string | undefined,
  nextBin = 'next'
): Array<string> => {
  const nextMajor = parseMajorVersion(nextVersion)
  const args = ['node', nextBin, 'build']

  assertSupportedRendererNextVersion(nextVersion)

  // TODO(atls/raijin#629): replace the explicit webpack renderer route with the
  // planned Turbopack contract once the Raijin v3 Next build stream owns it.
  if (nextMajor !== null && nextMajor >= NEXT_MAJOR_WEBPACK_BY_DEFAULT) {
    args.push('--webpack')
  }

  args.push('src')

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
