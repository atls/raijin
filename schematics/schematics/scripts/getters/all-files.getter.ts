/* eslint-disable n/no-sync */

import { statSync }    from 'fs'
import { readdirSync } from 'fs'
import { join }        from 'path'

export const getAllFiles = (dir: string, fileList: Array<string> = []): Array<string> => {
  readdirSync(dir).forEach((file) => {
    const fullPath = join(dir, file)
    if (statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, fileList)
    } else {
      fileList.push(fullPath)
    }
  })
  return fileList
}
