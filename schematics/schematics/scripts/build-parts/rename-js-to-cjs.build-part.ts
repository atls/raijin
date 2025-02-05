import { renameSync }            from 'fs'
import { extname }               from 'path'
import { join }                  from 'path'
import { dirname }               from 'path'
import { basename }              from 'path'

import { getAllFiles }           from '../getters/index.js'
import { checkTemplateFileUtil } from '../utils/index.js'

type Props = {
  outDir: string
}

export const renameJsToCjsBuildPart = ({ outDir }: Props) => {
  getAllFiles(outDir).forEach((file) => {
    const isTemplate = checkTemplateFileUtil(outDir, file)
    console.log(isTemplate, file)
    if (extname(file) === '.js' && !isTemplate) {
      const newPath = join(dirname(file), `${basename(file, '.js')}.cjs`)
      renameSync(file, newPath)
    }
  })
}
