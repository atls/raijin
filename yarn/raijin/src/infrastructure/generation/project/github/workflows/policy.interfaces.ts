export interface Manifest {
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
}

export interface Policy {
  readonly checkoutAction: string
  readonly containerRegistry: 'ghcr.io'
  readonly containerRepositoryExpression: string
  readonly nodeVersion: string
  readonly npmTokenSecret: string
  readonly setupNodeAction: string
}
