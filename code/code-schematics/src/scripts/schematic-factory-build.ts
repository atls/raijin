/* eslint-disable no-console */

import { join }              from 'node:path'

import { esbuildBuildStep }  from './build-steps/index.js'
import { generateSchematic } from './schematic-build.js'

const raijinSchematicDir = join(
  import.meta.dirname,
  '../../../../yarn/raijin/src/runtime/schematic'
)
const raijinSchematicOutputFile = join(
  import.meta.dirname,
  '../generated/raijin-schematic-export.ts'
)

try {
  await esbuildBuildStep()
  await generateSchematic(raijinSchematicDir, raijinSchematicOutputFile)
} catch (e: unknown) {
  const error = e as Error

  console.error('SchematicFactory build error!')
  console.error(error.message)
}

console.info('SchematicFactory build successed')
