import type { PortablePath } from '@yarnpkg/fslib'

export interface PackOptions {
  workspace: string
  registry: string
  publish: boolean
  builder: string
  buildpack: string
  tagPolicy: TagPolicy
  additionalTags?: Array<string>
  tagSuffixes?: Array<string>
  platform?: string
  require?: Array<string>
  cwd: PortablePath
}

export type TagPolicy = 'ctx-hash-timestamp' | 'explicit' | 'hash-timestamp' | 'revision'

export type PackOutputs = {
  workspace: string
  tags: Array<string>
} & ({ published: false; imageId: string } | { published: true; digest: string })
