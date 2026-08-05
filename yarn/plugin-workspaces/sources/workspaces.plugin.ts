import type { Plugin }                     from '@yarnpkg/core'

import { defineCommandInvocations }        from '@atls/raijin/commands'

import { WorkspacesChangedForeachCommand } from './workspaces-changed-foreach.command.js'
import { WorkspacesChangedListCommand }    from './workspaces-changed-list.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [WorkspacesChangedForeachCommand, WorkspacesChangedListCommand],
  }),
}
