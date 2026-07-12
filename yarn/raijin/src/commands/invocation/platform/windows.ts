import type { CommandPlatformAdapter } from './platform.interfaces.js'

import { npath }                       from '@yarnpkg/fslib'

export const windowsCommandPlatformAdapter: CommandPlatformAdapter = {
  resolveNativeCwd: (cwd) => npath.fromPortablePath(cwd),
}
