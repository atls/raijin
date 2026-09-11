import type { Source } from './source.interfaces.js'

export interface TransformInput {
  component: string
  native: boolean
  source: Source
}

export interface Transformer {
  transform: (input: TransformInput) => Promise<string>
}
