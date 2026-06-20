/* eslint-disable no-console */

import type { PortablePath }     from '@yarnpkg/fslib'

import { mkdir }                 from 'node:fs/promises'

import { ppath }                 from '@yarnpkg/fslib'

import { writeSchematicFactory } from '../generated/index.js'
import { writeCodeRuntimeFiles } from './code-runtime.js'

export const writeTmpSchematicHelper = async (
  tmpDir: PortablePath,
  cwd = process.cwd()
): Promise<void> => {
  await writeCodeRuntimeFiles(cwd, tmpDir)

  const projectDir = ppath.join(tmpDir, 'project')
  await mkdir(projectDir, { recursive: true })
  await writeSchematicFactory(ppath.join(projectDir, 'project.factory.cjs'))

  console.info('All Schematic files writed to the tmp!')
}
