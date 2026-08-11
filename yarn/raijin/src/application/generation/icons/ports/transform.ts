import type { IconSource } from './source.js'

export interface TransformIconInput {
  component: string
  native: boolean
  source: IconSource
}

export interface IconTransformer {
  transform: (input: TransformIconInput) => Promise<string>
}
