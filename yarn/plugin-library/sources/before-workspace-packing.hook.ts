import type { Workspace } from '@yarnpkg/core'

interface PackManifest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exports?: Record<string, any>
  main?: string
  types?: string
  typings?: string
}

interface RaijinManifest {
  pack?: PackManifest
}

export interface RawManifest {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exports?: Record<string, any>
  main?: string
  types?: string
  typings?: string

  publishConfig?: PackManifest
  raijin?: RaijinManifest
}

const applyPackManifest = (rawManifest: RawManifest, packManifest?: PackManifest): void => {
  if (!packManifest) {
    return
  }

  if (packManifest.exports) rawManifest.exports = packManifest.exports
  if (packManifest.main) rawManifest.main = packManifest.main
  if (packManifest.types) rawManifest.types = packManifest.types
  if (packManifest.typings) rawManifest.typings = packManifest.typings
}

export const beforeWorkspacePacking = (workspace: Workspace, rawManifest: RawManifest): void => {
  const isPrivateWorkspace = workspace.manifest.private

  applyPackManifest(
    rawManifest,
    isPrivateWorkspace ? rawManifest.raijin?.pack : rawManifest.publishConfig
  )

  delete rawManifest.raijin
}
