import type { CommandPlatformAdapter } from './platform.interfaces.js'

export const posixCommandPlatformAdapter: CommandPlatformAdapter = {
  resolveNativeCwd: (cwd) => cwd,
}
