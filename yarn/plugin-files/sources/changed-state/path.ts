import { posix } from 'node:path'

import { ChangedPathException } from './exceptions/path.js'

export const normalizeProjectPath = (path: string): string => {
  const normalized = posix.normalize(path)

  if (
    !path ||
    posix.isAbsolute(path) ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../')
  ) {
    throw new ChangedPathException(path)
  }

  return normalized
}
