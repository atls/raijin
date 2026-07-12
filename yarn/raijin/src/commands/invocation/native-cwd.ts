import type { PortablePath }             from '@yarnpkg/fslib'

import { resolveCommandPlatformAdapter } from './platform/index.js'

export const resolveNativeCommandCwd = (cwd: PortablePath): string =>
  resolveCommandPlatformAdapter().resolveNativeCwd(cwd)
