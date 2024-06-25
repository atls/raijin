import type { Workspace } from '@yarnpkg/core'

export const beforeWorkspacePacking = (workspace: Workspace, rawManifest: any) => {
  if (rawManifest.publishConfig) {
    if (rawManifest.publishConfig.exports) {
      // eslint-disable-next-line no-param-reassign
      rawManifest.exports = rawManifest.publishConfig.exports
    }
  }
}
