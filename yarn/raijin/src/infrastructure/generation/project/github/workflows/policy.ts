import type { Manifest } from './policy.interfaces.js'
import type { Policy }   from './policy.interfaces.js'

import { minVersion }    from 'semver'

const resolveNodeTypesVersion = ({
  dependencies = {},
  devDependencies = {},
}: Manifest): string | undefined => devDependencies['@types/node'] ?? dependencies['@types/node']

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

export const createPolicy = (manifest: Manifest): Policy => {
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
