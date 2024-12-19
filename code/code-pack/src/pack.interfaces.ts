export interface PackOptions {
  workspace: string
  registry: string
  publish: boolean
  builder: string
  buildpack: string
  tagPolicy: TagPolicy
  platform?: string
}

export type TagPolicy = 'ctx-hash-timestamp' | 'hash-timestamp' | 'revision'

export interface PackOutputs {
  images: Array<string>
  tags: Array<string>
  workspace: string
}
