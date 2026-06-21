import type { Plugin }                 from '@yarnpkg/core'

import { RaijinSyncCommand }           from './commands/index.js'
import { RaijinSyncTSConfigCommand }   from './commands/index.js'
import { RaijinSyncTypeScriptCommand } from './commands/index.js'
import { afterAllInstalled }           from './hooks/index.js'
import { afterYarnVersionSet }         from './hooks/index.js'
import { setupScriptEnvironment }      from './hooks/index.js'

export const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
    afterYarnVersionSet,
    setupScriptEnvironment,
  },
  commands: [RaijinSyncCommand, RaijinSyncTypeScriptCommand, RaijinSyncTSConfigCommand],
}
