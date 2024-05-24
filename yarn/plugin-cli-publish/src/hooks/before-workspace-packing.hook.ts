import type { Workspace } from '@yarnpkg/core'

export interface RawManifest {
  name: string
  dependencies: Record<string, string>
}

export const beforeWorkspacePacking = (workspace: Workspace, rawManifest: RawManifest): void => {
  if (rawManifest.name === '@atls/yarn-cli') {
    // eslint-disable-next-line no-param-reassign
    rawManifest.dependencies = new Proxy({}, { set: () => true })
  }
}
