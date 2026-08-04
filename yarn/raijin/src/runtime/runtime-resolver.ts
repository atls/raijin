/* eslint-disable n/no-sync */

import { readFileSync }  from 'node:fs'
import { createRequire } from 'node:module'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'

const PACKAGE_MANIFEST = 'package.json'
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

export const resolveRaijinRuntimePath = (cwd: string, specifier: string): string => {
  const boundary = findRaijinPackageBoundary(cwd)

  if (boundary) {
    return createRequire(join(boundary, PACKAGE_MANIFEST)).resolve(specifier)
  }

  return selfRequire.resolve(specifier)
}

export const resolveRaijinRuntimeUrl = (cwd: string, specifier: string): string =>
  pathToFileURL(resolveRaijinRuntimePath(cwd, specifier)).href
