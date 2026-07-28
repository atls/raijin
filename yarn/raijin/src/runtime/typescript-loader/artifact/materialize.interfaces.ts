export interface ArtifactFile {
  readonly path: string
  readonly source: string
}

export interface MaterializeOptions {
  readonly cachePath?: string
  readonly packagePath: string
  readonly sourcePath: string
}
