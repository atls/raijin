/* eslint-disable n/no-sync */

import { copyFileSync }           from 'fs'
import { extname }                from 'path'
import { relative }               from 'path'
import { join }                   from 'path'

import { ensureDirStructureUtil } from '../utils/index.js'
import { checkTemplateFileUtil }  from '../utils/index.js'

interface Props {
  srcDir: string
  outDir: string
  allFiles: Array<string>
}

export const cpJsonAndTemplatesToDistBuildPart = ({ srcDir, outDir, allFiles }: Props): void => {
  allFiles.forEach((file) => {
    const isTemplate = checkTemplateFileUtil(srcDir, file)
    if (extname(file) === '.json' || isTemplate) {
      const relativePath = relative(srcDir, file)
      const destPath = join(outDir, relativePath)
      ensureDirStructureUtil(destPath)
      copyFileSync(file, destPath)
    }
  })
}
