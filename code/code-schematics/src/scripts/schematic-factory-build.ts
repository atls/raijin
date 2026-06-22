/* eslint-disable no-console */

import { join }              from 'node:path'

import { esbuildBuildStep }  from './build-steps/index.js'
import { generateSchematic } from './schematic-build.js'

const runtimeSchematicDir = join(
  import.meta.dirname,
  '../../../../runtime/code-runtime/src/schematic'
)
const runtimeSchematicOutputFile = join(
  import.meta.dirname,
  '../generated/runtime-schematic-export.ts'
)

try {
  await esbuildBuildStep()
  await generateSchematic(runtimeSchematicDir, runtimeSchematicOutputFile)
} catch (e: unknown) {
  const error = e as Error

  console.error('SchematicFactory build error!')
  console.error(error.message)
}

console.info('SchematicFactory build successed')
