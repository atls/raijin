import type { Plugin }            from '@yarnpkg/core'

import { WorkspaceExportCommand } from './commands/index.js'

export const plugin: Plugin = {
  commands: [WorkspaceExportCommand],
}
