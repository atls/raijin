import type { Plugin }                 from '@yarnpkg/core'

import { defineCommandInvocations }    from '@atls/raijin/commands'

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
  commands: defineCommandInvocations({
    project: [RaijinSyncCommand],
    workspace: [RaijinSyncTypeScriptCommand, RaijinSyncTSConfigCommand],
  }),
}
