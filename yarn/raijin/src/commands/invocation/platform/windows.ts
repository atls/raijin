import type { CommandPlatformAdapter } from '../invocation.interfaces.js'

import { npath }                       from '@yarnpkg/fslib'

export const windowsCommandPlatformAdapter: CommandPlatformAdapter = {
  resolveNativeCwd: (cwd) => npath.fromPortablePath(cwd),
}
