import type { PortablePath }             from '@yarnpkg/fslib'

import type { CommandPath }              from './invocation.interfaces.js'

import { resolveCommandPlatformAdapter } from './platform/index.js'

export const createCommandPath = (portable: PortablePath): CommandPath => ({
  native: resolveCommandPlatformAdapter().resolveNativeCwd(portable),
  portable,
})
