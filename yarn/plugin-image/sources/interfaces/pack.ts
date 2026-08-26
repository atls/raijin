import type { PackOutputs } from '@atls/code-pack'

export type ImagePackResult = Omit<PackOutputs, 'images'> & {
  images: [string, ...Array<string>]
  status: 'built' | 'published'
}
