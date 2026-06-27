import { mkdir }                         from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { join }                          from 'node:path'

import esbuild                           from 'esbuild'

import { UndefinedBuildRedultException } from '../exceptions/index.js'
import { getEsbuildConfig }              from '../getters/index.js'
import { getCjsContent }                 from '../getters/index.js'

export const esbuildBuildStep = async (schematicOutputDir: string): Promise<void> => {
  const esbuildConfig = getEsbuildConfig()
  const result = await esbuild.build(esbuildConfig)

  if (!result.outputFiles) throw new UndefinedBuildRedultException()

  const cjsContent = getCjsContent(result)
  const projectDir = join(schematicOutputDir, 'project')

  await mkdir(projectDir, { recursive: true })
  await writeFile(join(projectDir, 'project.factory.cjs'), cjsContent)
}
