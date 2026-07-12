import type { CommandPlatformAdapter } from './platform.interfaces.js'

import { win32 }                       from 'node:path'

const WINDOWS_DRIVE_PORTABLE_PATH = /^\/[A-Za-z]:\//u

export const windowsCommandPlatformAdapter: CommandPlatformAdapter = {
  resolveNativeCwd: (cwd) =>
    win32.normalize(WINDOWS_DRIVE_PORTABLE_PATH.test(cwd) ? cwd.slice(1) : cwd),
}
