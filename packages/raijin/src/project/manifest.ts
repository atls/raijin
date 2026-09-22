import type { ProjectManifestSource } from './project.interfaces.js'

export const getManifestWorkspacePatterns = (manifest: ProjectManifestSource): Array<string> =>
  manifest.workspaceDefinitions.map(({ pattern }) => pattern)
