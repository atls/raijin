import type { GeneratedWorkflowPolicy } from './policy.interfaces.js'
import type { PackageManifest }         from './policy.interfaces.js'

const NODE_TYPES_DEPENDENCY = '@types/node'

const readNodeTypesVersion = ({
  dependencies,
  devDependencies,
  peerDependencies,
}: PackageManifest): string | undefined =>
  devDependencies?.[NODE_TYPES_DEPENDENCY] ??
  dependencies?.[NODE_TYPES_DEPENDENCY] ??
  peerDependencies?.[NODE_TYPES_DEPENDENCY]

const resolveNodeVersion = (manifest: PackageManifest): string => {
  const nodeTypesVersion = readNodeTypesVersion(manifest)
  const match = nodeTypesVersion?.match(/^(?:[~^])?(\d+)(?:\.|$)/)

  if (!match) {
    throw new Error(
      'The installed @atls/raijin package does not declare a semver @types/node version'
    )
  }

  return match[1]
}

export const createGeneratedWorkflowPolicy = (
  packageManifest: PackageManifest
): GeneratedWorkflowPolicy => ({
  checkoutAction: 'actions/checkout@v6',
  containerRegistry: 'ghcr.io',
  containerRegistryOwnerExpression: 'github.repository_owner',
  nodeVersion: resolveNodeVersion(packageManifest),
  npmTokenSecret: 'NPM_TOKEN',
  setupNodeAction: 'actions/setup-node@v6',
})
