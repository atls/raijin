export interface PackageManifest {
  readonly dependencies?: Record<string, string>
  readonly devDependencies?: Record<string, string>
  readonly peerDependencies?: Record<string, string>
}

export interface GeneratedWorkflowPolicy {
  readonly checkoutAction: string
  readonly containerRegistry: 'ghcr.io'
  readonly containerRegistryOwnerExpression: string
  readonly nodeVersion: string
  readonly npmTokenSecret: string
  readonly setupNodeAction: string
}
