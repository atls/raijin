/* eslint-disable no-console */

import { cp }               from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { join }             from 'node:path'

import { esbuildBuildStep } from './build-steps/index.js'

const schematicCollectionDir = join(import.meta.dirname, '../schematic/collection')
const schematicArtifactDir = join(import.meta.dirname, '../../dist/schematic')

try {
  await rm(schematicArtifactDir, { recursive: true, force: true })
  await cp(schematicCollectionDir, schematicArtifactDir, { recursive: true })
  await esbuildBuildStep(schematicArtifactDir)

  console.info('Schematic factory build succeeded')
} catch (e: unknown) {
  const error = e as Error

  console.error('Schematic factory build error!')
  console.error(error.message)
  process.exitCode = 1
}
