/* eslint-disable no-console */

import type { PortablePath }      from '@yarnpkg/fslib'

import { writeSchematicArtifact } from './schematic-artifact.js'

export const writeTmpSchematic = async (tmpDir: PortablePath): Promise<void> => {
  await writeSchematicArtifact(tmpDir)

  console.info('Schematic collection written to temporary directory.')
}
