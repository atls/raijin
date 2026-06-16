import { existsSync }   from 'node:fs'
import { readFileSync } from 'node:fs'
import { dirname }      from 'node:path'
import { join }         from 'node:path'

export interface PackageManifest {
  name?: string
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

const manifestCache = new Map<string, PackageManifest | null>()
const NODE_MODULES_SEGMENT = '/node_modules/'

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
  let current = context

  while (current !== dirname(current)) {
    const manifestPath = join(current, 'package.json')

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
