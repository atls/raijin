import type { Workspace } from '@yarnpkg/core'

export interface RawManifest {
  exports: Record<string, any>

  publishConfig: {
    exports: Record<string, any>
  }
}

export const beforeWorkspacePacking = (_: Workspace, rawManifest: RawManifest): void => {
  if (rawManifest.publishConfig) {
    if (rawManifest.publishConfig.exports) {
      // eslint-disable-next-line no-param-reassign
      rawManifest.exports = rawManifest.publishConfig.exports
    }
  }
}
