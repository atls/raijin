import type { Plugin }                from '@yarnpkg/core'

import { ToolsSyncTypeScriptCommand } from './commands/index.js'
import { ToolsSyncTSConfigCommand }   from './commands/index.js'
import { ToolsSyncRuntimeCommand }    from './commands/index.js'
import { ToolsSyncCommand }           from './commands/index.js'
import { afterYarnVersionSet }        from './hooks/index.js'
import { afterAllInstalled }          from './hooks/index.js'

export const plugin: Plugin = {
  commands: [
    ToolsSyncTypeScriptCommand,
    ToolsSyncTSConfigCommand,
    ToolsSyncRuntimeCommand,
    ToolsSyncCommand,
  ],
  hooks: {
    afterYarnVersionSet,
    afterAllInstalled,
  },
}
