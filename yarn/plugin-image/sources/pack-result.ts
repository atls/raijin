import type { PackOutputs }             from '@atls/code-pack'

import type { ImagePackResult }         from './interfaces/pack.js'

import { ImagePackCompletionException } from './exceptions/pack.js'

export const createPackResult = (outputs: PackOutputs, publish: boolean): ImagePackResult => {
  const [firstImage, ...remainingImages] = outputs.images

  if (!firstImage) {
    throw new ImagePackCompletionException(publish)
  }

  return {
    ...outputs,
    images: [firstImage, ...remainingImages],
    status: publish ? 'published' : 'built',
  }
}
