/* eslint-disable n/no-sync */

import { readFileSync }  from 'fs'
import { writeFileSync } from 'fs'
import { extname }       from 'path'

import { getAllFiles }   from '../getters/index.js'

interface Props {
  outDir: string
}

export const renameJsImportsBuildPart = ({ outDir }: Props): void => {
  getAllFiles(outDir).forEach((file) => {
    if (extname(file) === '.cjs') {
      let content = readFileSync(file, 'utf8')
      content = content.replace(/(\.js)(['"])/g, '.cjs$2')
      writeFileSync(file, content)
    }
  })
}
