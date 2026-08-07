import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { FilesChangedListCommand }  from './files-changed-list.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [FilesChangedListCommand] }),
}
