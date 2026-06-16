import { existsSync }    from 'node:fs'
import { readFileSync }  from 'node:fs'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'

export interface PackageManifest {
  exports?: unknown
  name?: string
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const manifestCache = new Map<string, PackageManifest | null>()
const NODE_MODULES_SEGMENT = '/node_modules/'
const PACKAGE_MANIFEST = 'package.json'
const REQUIRE_CONTEXT_FILENAME = '__raijin_optional_import__.js'
const ACTIVE_EXPORT_CONDITIONS = new Set(['default', 'import', 'node', 'node-addons', 'require'])

const isPathExisting = (path: string): boolean =>
  // IgnorePlugin.checkResource is synchronous, so resolver fallback must stay synchronous.
  // eslint-disable-next-line n/no-sync
  existsSync(path)

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

const COMPATIBILITY_OPTIONAL_IMPORTS = new Map<string, Set<string>>([
  [
    '@nestjs/microservices',
    new Set([
      '@grpc/grpc-js',
      '@nestjs/websockets',
      'amqp-connection-manager',
      'amqplib',
      'cache-manager',
      'ioredis',
      'kafkajs',
      'mqtt',
      'nats',
    ]),
  ],
  [
    '@nestjs/terminus',
    new Set([
      '@nestjs/mongoose',
      '@nestjs/sequelize',
      '@nestjs/sequelize/dist/common/sequelize.utils',
      '@nestjs/typeorm',
      '@nestjs/typeorm/dist/common/typeorm.utils',
    ]),
  ],
  [
    'typeorm',
    new Set([
      'mariadb',
      'mariadb/callback',
      'better-sqlite3',
      'pg-native',
      'hdb-pool',
      'oracledb',
      'mongodb',
      'tedious',
      'sqlite3',
      'mysql',
      'mysql2',
      'mssql',
      'sql.js',
      'libsql',
    ]),
  ],
  [
    '@mikro-orm/core',
    new Set([
      '@mikro-orm/better-sqlite',
      '@mikro-orm/mongodb',
      '@mikro-orm/mariadb',
      '@mikro-orm/sqlite',
      '@mikro-orm/mysql',
    ]),
  ],
])

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

const isOptionalByCompatibility = (
  manifest: PackageManifest,
  request: string,
  packageName: string
): boolean => {
  if (!manifest.name) {
    return false
  }

  const optionalImports = COMPATIBILITY_OPTIONAL_IMPORTS.get(manifest.name)

  return Boolean(optionalImports?.has(request) || optionalImports?.has(packageName))
}

export const isOptionalImport = (request: string, context: string): boolean => {
  const packageName = getPackageNameFromRequest(request)

  if (!packageName) {
    return false
  }

  if (!getPackageNameFromContext(context)) {
    return false
  }

  const manifestPath = findPackageManifestPath(context)

  if (!manifestPath) {
    return false
  }

  const manifest = readPackageManifest(manifestPath)

  if (!manifest) {
    return false
  }

  return (
    isOptionalByManifest(manifest, packageName) ||
    isOptionalByCompatibility(manifest, request, packageName)
  )
}

const isExistingPackageSubpath = (packagePath: string, subpath: string): boolean => {
  if (!subpath) {
    return true
  }

  const subpathCandidate = join(packagePath, subpath)

  return [
    subpathCandidate,
    `${subpathCandidate}.js`,
    `${subpathCandidate}.json`,
    join(subpathCandidate, 'index.js'),
    join(subpathCandidate, PACKAGE_MANIFEST),
  ].some(isPathExisting)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isSubpathExportPatternMatching = (exportKey: string, requestKey: string): boolean => {
  if (!exportKey.includes('*')) {
    return exportKey === requestKey
  }

  const [prefix, suffix = ''] = exportKey.split('*')

  return requestKey.startsWith(prefix) && requestKey.endsWith(suffix)
}

const compareSubpathExportPatterns = (left: string, right: string): number => {
  const [leftPrefix, leftSuffix = ''] = left.split('*')
  const [rightPrefix, rightSuffix = ''] = right.split('*')

  if (leftPrefix.length !== rightPrefix.length) {
    return rightPrefix.length - leftPrefix.length
  }

  if (leftSuffix.length !== rightSuffix.length) {
    return rightSuffix.length - leftSuffix.length
  }

  return right.length - left.length
}

const isExportTargetAvailable = (target: unknown): boolean => {
  if (target === null) {
    return false
  }

  if (typeof target === 'string') {
    return true
  }

  if (Array.isArray(target)) {
    return target.some(isExportTargetAvailable)
  }

  if (isObject(target)) {
    const condition = Object.keys(target).find((key) => ACTIVE_EXPORT_CONDITIONS.has(key))

    return condition ? isExportTargetAvailable(target[condition]) : false
  }

  return false
}

const isPackageSubpathExported = (manifest: PackageManifest, subpath: string): boolean => {
  if (!manifest.exports) {
    return true
  }

  const requestKey = subpath ? `./${subpath}` : '.'

  if (typeof manifest.exports === 'string' || Array.isArray(manifest.exports)) {
    return requestKey === '.'
  }

  if (!isObject(manifest.exports)) {
    return false
  }

  const packageExports = manifest.exports
  const exportKeys = Object.keys(packageExports)
  const hasSubpathExports = exportKeys.some((key) => key.startsWith('.'))

  if (!hasSubpathExports) {
    return requestKey === '.' && isExportTargetAvailable(packageExports)
  }

  if (Object.hasOwn(packageExports, requestKey)) {
    return isExportTargetAvailable(packageExports[requestKey])
  }

  const matchingPattern = exportKeys
    .filter((key) => key.includes('*') && isSubpathExportPatternMatching(key, requestKey))
    .sort(compareSubpathExportPatterns)
    .at(0)

  if (!matchingPattern) {
    return false
  }

  return isExportTargetAvailable(packageExports[matchingPattern])
}

const isNodeModulesResolvable = (request: string, context: string): boolean => {
  const packageName = getPackageNameFromRequest(request)

  if (!packageName) {
    return false
  }

  const subpath = request.slice(packageName.length).replace(/^\//, '')
  let current = context

  while (current !== dirname(current)) {
    const packagePath = join(current, 'node_modules', packageName)
    const manifestPath = join(packagePath, PACKAGE_MANIFEST)
    const manifest = readPackageManifest(manifestPath)

    if (
      manifest &&
      isPackageSubpathExported(manifest, subpath) &&
      isExistingPackageSubpath(packagePath, subpath)
    ) {
      return true
    }

    current = dirname(current)
  }

  return false
}

export const isImportResolvable = (request: string, paths: Array<string>): boolean => {
  const uniquePaths = Array.from(new Set(paths))

  return uniquePaths.some((path) => {
    try {
      createRequire(join(path, REQUIRE_CONTEXT_FILENAME)).resolve(request)

      return true
    } catch {
      return isNodeModulesResolvable(request, path)
    }
  })
}

export const shouldIgnoreOptionalImport = (
  request: string,
  context: string,
  cwd: string
): boolean => isOptionalImport(request, context) && !isImportResolvable(request, [context, cwd])
