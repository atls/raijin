export const EMPTY_IMAGE_BUILD_RESULT_DIAGNOSTIC = 'Image build completed without an image result.'
export const EMPTY_IMAGE_PUBLICATION_RESULT_DIAGNOSTIC =
  'Image publication completed without a published image.'

export class ImagePackCompletionException extends Error {
  constructor(publish: boolean) {
    super(publish ? EMPTY_IMAGE_PUBLICATION_RESULT_DIAGNOSTIC : EMPTY_IMAGE_BUILD_RESULT_DIAGNOSTIC)
    this.name = 'ImagePackCompletionException'
  }
}
