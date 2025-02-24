import { writeFile }                     from 'fs/promises'
import esbuild                           from 'esbuild'

import { UndefinedBuildRedultException } from '../exceptions/index.js'
import { getEsbuildConfig }              from '../getters/index.js'
import { getCjsContent }                 from '../getters/index.js'
import { getEncodedContent }             from '../getters/index.js'
import { getGeneratedFileContent }       from '../getters/index.js'

export const esbuildBuildStep = async (): Promise<void> => {
  const esbuildConfig = getEsbuildConfig()
  const result = await esbuild.build(esbuildConfig)

  if (!result.outputFiles) throw new UndefinedBuildRedultException()

  const cjsContent = getCjsContent(result)
  const encodedContent = getEncodedContent(cjsContent)

  const generatedFileContent = getGeneratedFileContent(encodedContent)

  await writeFile('src/generated/schematic-factory-export.ts', generatedFileContent)
}
