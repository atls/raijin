import type { webpack as wp } from '@atls/raijin/webpack'

import { existsSync }         from 'node:fs'
import { readFileSync }       from 'node:fs'
import { dirname }            from 'node:path'
import { join }               from 'node:path'

export interface PackageManifest {
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const manifestCache = new Map<string, PackageManifest | null>()
const NODE_MODULES_SEGMENT = '/node_modules/'
const PACKAGE_MANIFEST = 'package.json'
const OPTIONAL_IMPORT_IGNORE_PLUGIN = 'OptionalImportIgnorePlugin'
const PACKAGE_OPTIONAL_IMPORTS = new Map<string, Set<string>>([
  ['typeorm', new Set(['expo-sqlite'])],
])

interface WebpackResolver {
  resolve: (
    context: Record<string, unknown>,
    path: string,
    request: string,
    resolveContext: Record<string, unknown>,
    callback: (error?: Error | null, result?: unknown) => void
  ) => void
}

interface WebpackDependency {
  optional?: boolean
}

const hasOptionalDependency = (dependencies?: Array<WebpackDependency>): boolean =>
  dependencies?.some((dependency) => dependency.optional === true) ?? false

const getPackagePathFromContext = (context: string): string | null => {
  const normalizedContext = context.replaceAll('\\', '/')
  const nodeModulesIndex = normalizedContext.lastIndexOf(NODE_MODULES_SEGMENT)

  if (nodeModulesIndex === -1) {
    return null
  }

  const packageSegments = normalizedContext
    .slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length)
    .split('/')

  const [first] = packageSegments

  if (!first) {
    return null
  }

  const segmentCount = first.startsWith('@') ? 2 : 1
  const packagePathSegments = packageSegments.slice(0, segmentCount)

  if (
    packagePathSegments.length !== segmentCount ||
    packagePathSegments.some((segment) => !segment)
  ) {
    return null
  }

  return `${normalizedContext.slice(0, nodeModulesIndex + NODE_MODULES_SEGMENT.length)}${packagePathSegments.join('/')}`
}

export const getPackageNameFromRequest = (request: string): string | null => {
  if (request.startsWith('.') || request.startsWith('/')) {
    return null
  }

  const [first, second] = request.split('/')

  if (!first) {
    return null
  }

  if (first.startsWith('@')) {
    return second ? `${first}/${second}` : null
  }

  return first
}

export const getPackageNameFromContext = (context: string): string | null => {
  const normalizedContext = context.replaceAll('\\', '/')
  const nodeModulesIndex = normalizedContext.lastIndexOf(NODE_MODULES_SEGMENT)

  if (nodeModulesIndex === -1) {
    return null
  }

  const packageSegments = normalizedContext
    .slice(nodeModulesIndex + NODE_MODULES_SEGMENT.length)
    .split('/')

  const [first, second] = packageSegments

  if (!first) {
    return null
  }

  if (first.startsWith('@')) {
    return second ? `${first}/${second}` : null
  }

  return first
}

export const findPackageManifestPath = (context: string): string | null => {
  const packagePath = getPackagePathFromContext(context)

  if (packagePath) {
    const manifestPath = join(packagePath, PACKAGE_MANIFEST)

    // IgnorePlugin.checkResource is synchronous, so manifest lookup must stay synchronous.
    // eslint-disable-next-line n/no-sync
    if (existsSync(manifestPath)) {
      return manifestPath
    }
  }

  let current = context

  while (current !== dirname(current)) {
    const manifestPath = join(current, PACKAGE_MANIFEST)

    // IgnorePlugin.checkResource is synchronous, so manifest lookup must stay synchronous.
    // eslint-disable-next-line n/no-sync
    if (existsSync(manifestPath)) {
      return manifestPath
    }

    current = dirname(current)
  }

  return null
}

const readPackageManifest = (manifestPath: string): PackageManifest | null => {
  if (manifestCache.has(manifestPath)) {
    return manifestCache.get(manifestPath) ?? null
  }

  try {
    // IgnorePlugin.checkResource is synchronous, so manifest lookup must stay synchronous.
    // eslint-disable-next-line n/no-sync
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as PackageManifest

    manifestCache.set(manifestPath, manifest)

    return manifest
  } catch {
    manifestCache.set(manifestPath, null)

    return null
  }
}

const isOptionalByManifest = (manifest: PackageManifest, packageName: string): boolean =>
  manifest.peerDependenciesMeta?.[packageName]?.optional === true ||
  Boolean(manifest.optionalDependencies?.[packageName])

const isOptionalByPackage = (context: string, packageName: string): boolean => {
  const issuerPackageName = getPackageNameFromContext(context)

  if (!issuerPackageName) {
    return false
  }

  return PACKAGE_OPTIONAL_IMPORTS.get(issuerPackageName)?.has(packageName) ?? false
}

export const isOptionalImport = (
  request: string,
  context: string,
  isDependencyOptional = false
): boolean => {
  const packageName = getPackageNameFromRequest(request)

  if (!packageName) {
    return false
  }

  if (!getPackageNameFromContext(context)) {
    return false
  }

  if (isOptionalByPackage(context, packageName)) {
    return true
  }

  const manifestPath = findPackageManifestPath(context)

  if (!manifestPath) {
    return false
  }

  const manifest = readPackageManifest(manifestPath)

  if (!manifest) {
    return false
  }

  return isDependencyOptional || isOptionalByManifest(manifest, packageName)
}

const isImportResolvable = async (
  resolver: WebpackResolver,
  request: string,
  context: string
): Promise<boolean> =>
  new Promise((resolve) => {
    resolver.resolve({}, context, request, {}, (error, result) => {
      resolve(!error && Boolean(result))
    })
  })

export const shouldIgnoreOptionalImport = async (
  request: string,
  context: string,
  resolver: WebpackResolver,
  isDependencyOptional = false
): Promise<boolean> => {
  if (!isOptionalImport(request, context, isDependencyOptional)) {
    return false
  }

  return !(await isImportResolvable(resolver, request, context))
}

export const createOptionalImportIgnorePlugin = (
  _environment: string
): wp.WebpackPluginInstance => ({
  apply: (compiler): void => {
    compiler.hooks.normalModuleFactory.tap(OPTIONAL_IMPORT_IGNORE_PLUGIN, (normalModuleFactory) => {
      normalModuleFactory.hooks.beforeResolve.tapAsync(OPTIONAL_IMPORT_IGNORE_PLUGIN, (
        resolveData,
        callback
      ) => {
        if (resolveData.request.endsWith('.js.map')) {
          callback(null, false)
          return
        }

        const resolver = normalModuleFactory.getResolver('normal', {
          ...(resolveData.resolveOptions ?? {}),
          dependencyType: resolveData.dependencyType,
        })

        shouldIgnoreOptionalImport(
          resolveData.request,
          resolveData.context,
          resolver,
          hasOptionalDependency(resolveData.dependencies as Array<WebpackDependency> | undefined)
        )
          .then((shouldIgnore) => {
            callback(null, shouldIgnore ? false : undefined)
          })
          .catch((error: Error) => {
            callback(error)
          })
      })
    })
  },
})
