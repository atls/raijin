import type { CommandPlatformAdapter } from '../invocation.interfaces.js'

export const posixCommandPlatformAdapter: CommandPlatformAdapter = {
  resolveNativeCwd: (cwd) => cwd,
}
