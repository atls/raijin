import type { webpack as wp } from '@atls/code-runtime/webpack'

import { existsSync }         from 'node:fs'
import { readFileSync }       from 'node:fs'
import { dirname }            from 'node:path'
import { join }               from 'node:path'

export interface PackageManifest {
  exports?: unknown
  main?: string
  module?: string
  name?: string
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const manifestCache = new Map<string, PackageManifest | null>()
const NODE_MODULES_SEGMENT = '/node_modules/'
const PACKAGE_MANIFEST = 'package.json'
const OPTIONAL_IMPORT_IGNORE_PLUGIN = 'OptionalImportIgnorePlugin'

interface WebpackResolver {
  resolveSync: (context: Record<string, unknown>, path: string, request: string) => unknown
}

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

export const getWebpackResolveConditionNames = (
  dependencyType: string | undefined,
  environment: string
): Array<string> => {
  const environmentConditions = [environment, 'webpack', 'node', 'default']

  if (dependencyType === 'commonjs') {
    return ['require', ...environmentConditions]
  }

  if (dependencyType === 'esm') {
    return ['import', 'module', ...environmentConditions]
  }

  return environmentConditions
}

const isImportResolvable = (
  resolver: WebpackResolver,
  request: string,
  context: string
): boolean => {
  try {
    // IgnorePlugin hooks are synchronous, so the webpack resolver check must stay synchronous.
    // eslint-disable-next-line n/no-sync
    resolver.resolveSync({}, context, request)

    return true
  } catch {
    return false
  }
}

export const shouldIgnoreOptionalImport = (
  request: string,
  context: string,
  resolver: WebpackResolver
): boolean => isOptionalImport(request, context) && !isImportResolvable(resolver, request, context)

export const createOptionalImportIgnorePlugin = (
  environment: string
): wp.WebpackPluginInstance => ({
  apply: (compiler): void => {
    compiler.hooks.normalModuleFactory.tap(OPTIONAL_IMPORT_IGNORE_PLUGIN, (normalModuleFactory) => {
      normalModuleFactory.hooks.beforeResolve.tap(OPTIONAL_IMPORT_IGNORE_PLUGIN, (resolveData) => {
        if (resolveData.request.endsWith('.js.map')) {
          return false
        }

        const conditionNames = getWebpackResolveConditionNames(
          resolveData.dependencyType,
          environment
        )
        const resolver = normalModuleFactory.getResolver('normal', {
          ...(resolveData.resolveOptions ?? {}),
          conditionNames,
        })

        return shouldIgnoreOptionalImport(resolveData.request, resolveData.context, resolver)
          ? false
          : undefined
      })
    })
  },
})
