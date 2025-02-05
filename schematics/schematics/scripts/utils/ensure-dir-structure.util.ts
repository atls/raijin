import { mkdirSync } from 'fs'
import { dirname }   from 'path'

export const ensureDirStructureUtil = (filePath: string): void => {
  const dir = dirname(filePath)
  mkdirSync(dir, { recursive: true })
}
