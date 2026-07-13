import { normalize as normalizePosix }   from './posix.js'
import { normalize as normalizeWindows } from './windows.js'

export const normalize = (pattern: string, platform: NodeJS.Platform = process.platform): string =>
  platform === 'win32' ? normalizeWindows(pattern) : normalizePosix(pattern)
