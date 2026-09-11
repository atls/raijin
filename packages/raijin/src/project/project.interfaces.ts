export type ProjectType = 'monorepo' | 'single'

export interface ProjectManifestSource {
  workspaceDefinitions: ReadonlyArray<{
    pattern: string
  }>
}

export interface ProjectWorkspaceSource<TCwd extends string = string> {
  cwd: TCwd
  manifest: ProjectManifestSource
}

export interface ProjectSource<TWorkspace extends ProjectWorkspaceSource = ProjectWorkspaceSource> {
  topLevelWorkspace: TWorkspace
  workspaces: Iterable<TWorkspace>
}

export interface RaijinProjectModel<
  TWorkspace extends ProjectWorkspaceSource = ProjectWorkspaceSource,
> {
  cwd: TWorkspace['cwd']
  topLevelWorkspace: TWorkspace
  type: ProjectType
  workspacePatterns: Array<string>
  workspaces: Array<TWorkspace>
}
