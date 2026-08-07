export interface GitIgnoreState {
  content?: Buffer
}

export interface Options {
  readonly checkoutAction: string
  readonly containerRegistry: string
  readonly containerRepositoryExpression: string
  readonly nodeVersion: string
  readonly npmTokenSecret: string
  readonly scaffoldType: 'library' | 'project'
  readonly setupNodeAction: string
  readonly typescriptCompilerOptions: Record<string, unknown>
}
