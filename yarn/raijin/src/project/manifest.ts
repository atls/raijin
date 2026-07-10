export interface ProjectManifestSource {
  workspaceDefinitions: ReadonlyArray<{
    pattern: string
  }>
}

export const getManifestWorkspacePatterns = (manifest: ProjectManifestSource): Array<string> =>
  manifest.workspaceDefinitions.map(({ pattern }) => pattern)
