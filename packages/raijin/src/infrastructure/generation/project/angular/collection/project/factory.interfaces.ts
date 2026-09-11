export interface Options {
  readonly scaffoldType: 'library' | 'project'
  readonly typescriptCompilerOptions: Record<string, unknown>
}
