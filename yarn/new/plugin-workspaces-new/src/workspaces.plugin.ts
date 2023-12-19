import { Plugin }                          from '@yarnpkg/core'

import { WorkspacesChangedForeachCommand } from './workspaces-changed-foreach.command'
import { WorkspacesChangedListCommand }    from './workspaces-changed-list.command'

export const plugin: Plugin = {
  commands: [WorkspacesChangedForeachCommand, WorkspacesChangedListCommand],
}
