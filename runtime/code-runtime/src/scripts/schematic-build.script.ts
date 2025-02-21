/* eslint-disable no-console */

import { join }              from 'node:path'

import { generateSchematic } from '@atls/code-schematics'

try {
  const schematicDir = join(import.meta.dirname, '../schematic')
  const outputFile = join(import.meta.dirname, '../generated/schematic-export.ts')

  generateSchematic(schematicDir, outputFile)
  console.info('Schematic build successed')
} catch (e: unknown) {
  const error = e as Error

  console.error('Schematic build error!')
  console.error(error)
}
