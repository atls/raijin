import { minVersion } from 'semver'

export interface GeneratedWorkflowPolicy {
  checkoutAction: string
  containerRegistry: string
  containerRepositoryExpression: string
  nodeVersion: string
  npmTokenSecret: string
  setupNodeAction: string
}

export interface RaijinGenerationManifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

const resolveNodeTypesVersion = ({
  dependencies = {},
  devDependencies = {},
}: RaijinGenerationManifest): string | undefined =>
  devDependencies['@types/node'] ?? dependencies['@types/node']

const resolveNodeMajor = (version: string | undefined): number | undefined => {
  if (!version) {
    return undefined
  }

  try {
    return minVersion(version)?.major
  } catch {
    return undefined
  }
}

export const createGeneratedWorkflowPolicy = (
  manifest: RaijinGenerationManifest
): GeneratedWorkflowPolicy => {
  const nodeTypesVersion = resolveNodeTypesVersion(manifest)
  const nodeVersion = resolveNodeMajor(nodeTypesVersion)

  if (nodeVersion === undefined) {
    throw new Error('Installed @atls/raijin does not declare a semver @types/node version')
  }

  return {
    checkoutAction: 'actions/checkout@v6',
    containerRegistry: 'ghcr.io',
    containerRepositoryExpression: 'github.repository',
    nodeVersion: String(nodeVersion),
    npmTokenSecret: 'NPM_TOKEN',
    setupNodeAction: 'actions/setup-node@v6',
  }
}
