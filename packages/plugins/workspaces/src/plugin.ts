import type { Plugin }                     from '@yarnpkg/core'

import { defineCommandInvocations }        from '@atls/raijin/commands'

import { WorkspacesChangedForeachCommand } from './commands/foreach.js'
import { WorkspacesChangedListCommand }    from './commands/list.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [WorkspacesChangedForeachCommand, WorkspacesChangedListCommand],
  }),
}
