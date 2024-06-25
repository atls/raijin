import { Plugin }                          from '@yarnpkg/core'

import { WorkspacesChangedForeachCommand } from './workspaces-changed-foreach.command.js'
import { WorkspacesChangedListCommand }    from './workspaces-changed-list.command.js'

export const plugin: Plugin = {
  commands: [WorkspacesChangedForeachCommand, WorkspacesChangedListCommand],
}
