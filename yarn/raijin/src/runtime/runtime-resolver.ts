/* eslint-disable n/no-sync */

import { existsSync }    from 'node:fs'
import { readFileSync }  from 'node:fs'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'

const PACKAGE_MANIFEST = 'package.json'
const PNP_MANIFEST = '.pnp.cjs'
const RAIJIN_PACKAGE_NAME = '@atls/raijin'
const PACKAGE_DEPENDENCY_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const

type PackageManifestShape = Record<string, unknown> & {
  dependencies?: Record<string, unknown>
  devDependencies?: Record<string, unknown>
  name?: unknown
  optionalDependencies?: Record<string, unknown>
  peerDependencies?: Record<string, unknown>
}

interface PnpApi {
  resolveRequest: (request: string, issuer: string) => string | null
}

const selfRequire = createRequire(import.meta.url)

const readPackageManifestAt = (cwd: string): PackageManifestShape | undefined => {
  try {
    return JSON.parse(readFileSync(join(cwd, PACKAGE_MANIFEST), 'utf-8')) as PackageManifestShape
  } catch {
    return undefined
  }
}

const hasRaijinPackageBoundary = (manifest: PackageManifestShape): boolean =>
  manifest.name === RAIJIN_PACKAGE_NAME ||
  PACKAGE_DEPENDENCY_FIELDS.some((field) =>
    Object.hasOwn(manifest[field] ?? {}, RAIJIN_PACKAGE_NAME))

export const findRaijinPackageBoundary = (cwd: string): string | undefined => {
  let current = cwd

  while (true) {
    const manifest = readPackageManifestAt(current)

    if (manifest && hasRaijinPackageBoundary(manifest)) {
      return current
    }

    const parent = dirname(current)

    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

const findPnpManifest = (cwd: string): string | undefined => {
  let current = cwd

  while (true) {
    const manifest = join(current, PNP_MANIFEST)

    if (existsSync(manifest)) {
      return manifest
    }

    const parent = dirname(current)

    if (parent === current) {
      return undefined
    }

    current = parent
  }
}

export const resolveRaijinRuntimePath = (cwd: string, specifier: string): string => {
  const boundary = findRaijinPackageBoundary(cwd)

  if (boundary) {
    const issuer = join(boundary, PACKAGE_MANIFEST)
    const pnpManifest = findPnpManifest(boundary)

    if (pnpManifest) {
      const pnpApi = selfRequire(pnpManifest) as PnpApi
      const resolved = pnpApi.resolveRequest(specifier, issuer)

      if (resolved) {
        return resolved
      }
    }

    return createRequire(issuer).resolve(specifier)
  }

  return selfRequire.resolve(specifier)
}

export const resolveRaijinRuntimeUrl = (cwd: string, specifier: string): string =>
  pathToFileURL(resolveRaijinRuntimePath(cwd, specifier)).href
