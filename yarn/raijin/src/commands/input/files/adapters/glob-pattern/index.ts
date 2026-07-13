import type { GlobPatternAdapter } from './glob-pattern.interfaces.js'

import { toGlobby as toPosix }     from './posix.js'
import { toGlobby as toWindows }   from './windows.js'

const POSIX_ADAPTER: GlobPatternAdapter = {
  toGlobby: toPosix,
}

const WINDOWS_ADAPTER: GlobPatternAdapter = {
  toGlobby: toWindows,
}

export const selectGlobPatternAdapter = (
  platform: NodeJS.Platform = process.platform
): GlobPatternAdapter => (platform === 'win32' ? WINDOWS_ADAPTER : POSIX_ADAPTER)
