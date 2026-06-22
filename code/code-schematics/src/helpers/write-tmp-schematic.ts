/* eslint-disable no-console */

import type { PortablePath }     from '@yarnpkg/fslib'

import { mkdir }                 from 'node:fs/promises'

import { ppath }                 from '@yarnpkg/fslib'

import { writeSchematicFactory } from '../generated/index.js'
import { writeRaijinFiles }      from './raijin.js'

export const writeTmpSchematicHelper = async (
  tmpDir: PortablePath,
  cwd = process.cwd()
): Promise<void> => {
  await writeRaijinFiles(cwd, tmpDir)

  const projectDir = ppath.join(tmpDir, 'project')
  await mkdir(projectDir, { recursive: true })
  await writeSchematicFactory(ppath.join(projectDir, 'project.factory.cjs'))

  console.info('All Schematic files writed to the tmp!')
}
