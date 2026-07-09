import type { Descriptor } from '@yarnpkg/core'
import type { Ident }      from '@yarnpkg/core'
import type { Manifest }   from '@yarnpkg/core'

export const getWorkspacePatterns = (workspaces: unknown): Array<string> => {
  if (Array.isArray(workspaces)) {
    return workspaces.filter((workspace): workspace is string => typeof workspace === 'string')
  }

  if (
    typeof workspaces === 'object' &&
    workspaces !== null &&
    Array.isArray((workspaces as { packages?: unknown }).packages)
  ) {
    return (workspaces as { packages: Array<unknown> }).packages.filter(
      (workspace): workspace is string => typeof workspace === 'string'
    )
  }

  return []
}

export const getManifestWorkspacePatterns = (manifest: Manifest): Array<string> =>
  getWorkspacePatterns(manifest.raw.workspaces)

export const getManifestDescriptor = (manifest: Manifest, ident: Ident): Descriptor | undefined =>
  manifest.dependencies.get(ident.identHash) ??
  manifest.devDependencies.get(ident.identHash) ??
  manifest.peerDependencies.get(ident.identHash)

export const hasManifestDependency = (manifest: Manifest, ident: Ident): boolean =>
  typeof getManifestDescriptor(manifest, ident) !== 'undefined'
