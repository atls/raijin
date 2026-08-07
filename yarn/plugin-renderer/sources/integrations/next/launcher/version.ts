import type { Locator } from '@yarnpkg/core'

import { structUtils }  from '@yarnpkg/core'

const MAJOR_WEBPACK_BY_DEFAULT = 16
const NPM_PROTOCOL = 'npm:'
const NPM_REFERENCE_PATTERN = /(?:^|@)npm:([^#@]+)/

const parseMajorVersion = (version: string | undefined): number | null => {
  if (!version) {
    return null
  }

  const [major] = version.split('.')
  const parsed = Number.parseInt(major, 10)

  return Number.isNaN(parsed) ? null : parsed
}

export const assertSupportedNextVersion = (nextVersion: string | undefined): void => {
  const nextMajor = parseMajorVersion(nextVersion)

  if (nextMajor !== null && nextMajor < MAJOR_WEBPACK_BY_DEFAULT) {
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

export const shouldUseWebpackRoute = (nextVersion: string | undefined): boolean => {
  const nextMajor = parseMajorVersion(nextVersion)

  return nextMajor !== null && nextMajor >= MAJOR_WEBPACK_BY_DEFAULT
}
