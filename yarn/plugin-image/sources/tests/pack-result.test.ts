import assert                                        from 'node:assert/strict'
import { test }                                      from 'node:test'

import { EMPTY_IMAGE_PUBLICATION_RESULT_DIAGNOSTIC } from '../exceptions/pack.js'
import { ImagePackCompletionException }              from '../exceptions/pack.js'
import { createPackResult }                          from '../pack-result.js'

test('should prove a successful publication with at least one image', () => {
  assert.deepEqual(
    createPackResult(
      {
        images: ['registry.example.com/app/service:revision'],
        tags: ['revision'],
        workspace: '@app/service',
      },
      true
    ),
    {
      images: ['registry.example.com/app/service:revision'],
      status: 'published',
      tags: ['revision'],
      workspace: '@app/service',
    }
  )
})

test('should reject a completed publication without an image result', () => {
  assert.throws(() => createPackResult({ images: [], tags: [], workspace: '@app/service' }, true), {
    constructor: ImagePackCompletionException,
    message: EMPTY_IMAGE_PUBLICATION_RESULT_DIAGNOSTIC,
    name: 'ImagePackCompletionException',
  })
})
