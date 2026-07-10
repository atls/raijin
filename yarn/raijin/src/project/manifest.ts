import type { Manifest } from '@yarnpkg/core'

export const getManifestWorkspacePatterns = (manifest: Manifest): Array<string> =>
  manifest.workspaceDefinitions.map(({ pattern }) => pattern)
