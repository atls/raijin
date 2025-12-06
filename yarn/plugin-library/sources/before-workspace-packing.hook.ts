import type { Workspace } from '@yarnpkg/core'

export interface RawManifest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exports?: Record<string, any>

  publishConfig?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    exports?: Record<string, any>
  }
}

export const beforeWorkspacePacking = (_: Workspace, rawManifest: RawManifest): void => {
  if (rawManifest.publishConfig) {
    if (rawManifest.publishConfig.exports) {
      rawManifest.exports = rawManifest.publishConfig.exports
    }
  }
}
