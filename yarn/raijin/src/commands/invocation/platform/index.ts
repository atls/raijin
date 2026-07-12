import type { CommandPlatformAdapter }   from '../invocation.interfaces.js'

import { posixCommandPlatformAdapter }   from './posix.js'
import { windowsCommandPlatformAdapter } from './windows.js'

export const resolveCommandPlatformAdapter = (
  platform: NodeJS.Platform = process.platform
): CommandPlatformAdapter =>
  platform === 'win32' ? windowsCommandPlatformAdapter : posixCommandPlatformAdapter

export { posixCommandPlatformAdapter }   from './posix.js'
export { windowsCommandPlatformAdapter } from './windows.js'
