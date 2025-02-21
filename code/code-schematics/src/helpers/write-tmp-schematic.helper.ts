/* eslint-disable no-console */

import { mkdir }                 from 'node:fs/promises'
import { rm }                    from 'node:fs/promises'
import { join }                  from 'node:path'

import { writeSchematicFactory } from '../generated/index.js'

export const writeTmpSchematicHelper = async (): Promise<void> => {
  const { writeFiles } = await import('@atls/code-runtime')

  const TMP_PATH = './tmp'

  await rm(TMP_PATH, { recursive: true, force: true })
  await mkdir(TMP_PATH)
  await writeFiles(TMP_PATH)

  await mkdir(join(TMP_PATH, 'project'), { recursive: true })
  await writeSchematicFactory('./tmp/project/project.factory.cjs')

  console.info('All Schematic files writed to the ./tmp!')
}
