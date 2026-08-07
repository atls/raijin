import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { WorkspaceExportCommand }   from './commands/index.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [WorkspaceExportCommand] }),
}
