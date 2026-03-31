/* eslint-disable no-console */

import { esbuildBuildStep } from './build-steps/index.js'

try {
  await esbuildBuildStep()
} catch (e: unknown) {
  const error = e as Error

  console.error('SchematicFactory build error!')
  console.error(error.message)
}

console.info('SchematicFactory build successed')
