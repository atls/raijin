/* eslint-disable no-console */

import { cp }               from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { join }             from 'node:path'

import { esbuildBuildStep } from './build-steps/index.js'

const raijinSchematicDir = join(
  import.meta.dirname,
  '../../../../yarn/raijin/src/runtime/schematic'
)
const raijinSchematicOutputDir = join(import.meta.dirname, '../../dist/schematic')

try {
  await rm(raijinSchematicOutputDir, { recursive: true, force: true })
  await cp(raijinSchematicDir, raijinSchematicOutputDir, { recursive: true })
  await esbuildBuildStep(raijinSchematicOutputDir)

  console.info('SchematicFactory build successed')
} catch (e: unknown) {
  const error = e as Error

  console.error('SchematicFactory build error!')
  console.error(error.message)
  process.exitCode = 1
}
