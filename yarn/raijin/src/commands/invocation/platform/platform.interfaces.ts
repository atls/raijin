import type { PortablePath } from '@yarnpkg/fslib'

export interface CommandPlatformAdapter {
  resolveNativeCwd: (cwd: PortablePath) => string
}
