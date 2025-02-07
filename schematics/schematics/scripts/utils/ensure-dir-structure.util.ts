import { mkdirSync } from 'fs'
import { dirname }   from 'path'

export const ensureDirStructureUtil = (filePath: string): void => {
  const dir = dirname(filePath)
  // eslint-disable-next-line n/no-sync
  mkdirSync(dir, { recursive: true })
}
