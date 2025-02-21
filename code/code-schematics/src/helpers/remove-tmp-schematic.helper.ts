/* eslint-disable no-console */

import { rm } from 'node:fs/promises'

export const removeTmpSchematicHelper = async (): Promise<void> => {
  const TMP_PATH = './tmp'
  await rm(TMP_PATH, { recursive: true, force: true })

  console.info('./tmp directory removed!')
}
