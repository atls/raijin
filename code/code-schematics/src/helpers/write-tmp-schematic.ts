/* eslint-disable no-console */

import type { PortablePath } from '@yarnpkg/fslib'

import { writeRaijinFiles }  from './raijin.js'

export const writeTmpSchematicHelper = async (
  tmpDir: PortablePath,
  cwd = process.cwd()
): Promise<void> => {
  await writeRaijinFiles(cwd, tmpDir)

  console.info('All Schematic files writed to the tmp!')
}
