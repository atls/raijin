import type { Ident }    from '@yarnpkg/core'
import type { Manifest } from '@yarnpkg/core'
import type { Package }  from '@yarnpkg/core'
import type { Project }  from '@yarnpkg/core'

import { structUtils }   from '@yarnpkg/core'

const NPM_PROTOCOL = 'npm:'
const PATCH_PROTOCOL = 'patch:'
const PATCH_SOURCE_PATTERN = /^patch:[^@]+@([^#]+)#/
const raijinIdent = structUtils.parseIdent('@atls/raijin')
const typescriptIdent = structUtils.parseIdent('typescript')

export const findStoredPackageByIdent = (
  packages: Iterable<Package>,
  ident: Ident
): Package | undefined =>
  Array.from(packages).find((storedPackage) => storedPackage.identHash === ident.identHash)

export const normalizeTypeScriptRange = (range: string | undefined): string | undefined => {
  if (!range) {
    return undefined
  }

  const normalizedRange = range.startsWith(PATCH_PROTOCOL)
    ? decodeURIComponent(range.match(PATCH_SOURCE_PATTERN)?.[1] ?? range)
    : range

  return normalizedRange.startsWith(NPM_PROTOCOL)
    ? normalizedRange.slice(NPM_PROTOCOL.length)
    : normalizedRange
}

export const getRaijinTypeScriptRange = (project: Project): string | undefined =>
  normalizeTypeScriptRange(
    findStoredPackageByIdent(project.storedPackages.values(), raijinIdent)?.dependencies.get(
      typescriptIdent.identHash
    )?.range
  )

export const shouldSyncTypeScriptRange = (
  currentRange: string | undefined,
  raijinTypeScriptRange: string
): boolean =>
  normalizeTypeScriptRange(currentRange) !== normalizeTypeScriptRange(raijinTypeScriptRange)

export const syncTypeScriptManifest = (
  manifest: Manifest,
  raijinTypeScriptRange: string | undefined
): boolean => {
  if (!raijinTypeScriptRange || !manifest.raw.devDependencies) {
    return false
  }

  let descriptor = Array.from(manifest.devDependencies.values()).find(
    (target) => target.scope === typescriptIdent.scope && target.name === typescriptIdent.name
  )

  if (descriptor && !shouldSyncTypeScriptRange(descriptor.range, raijinTypeScriptRange)) {
    return false
  }

  descriptor = structUtils.makeDescriptor(typescriptIdent, raijinTypeScriptRange)
  manifest.devDependencies.set(descriptor.identHash, descriptor)

  return true
}
