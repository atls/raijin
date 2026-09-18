import type { Manifest } from '@yarnpkg/core'

export const isImageWorkspace = (manifest: Manifest): boolean =>
  Boolean(manifest.name && manifest.scripts.get('start')?.trim())
