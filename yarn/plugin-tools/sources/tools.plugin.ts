import type { Plugin }                from '@yarnpkg/core'

import { ToolsSyncCommand }           from './commands/index.js'
import { ToolsSyncTSConfigCommand }   from './commands/index.js'
import { ToolsSyncTypeScriptCommand } from './commands/index.js'
import { afterAllInstalled }          from './hooks/index.js'
import { afterYarnVersionSet }        from './hooks/index.js'

export const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
    afterYarnVersionSet,
  },
  commands: [ToolsSyncCommand, ToolsSyncTypeScriptCommand, ToolsSyncTSConfigCommand],
}
