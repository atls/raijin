import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { LibraryBuildCommand }      from './build/command.jsx'
import { beforeWorkspacePacking }   from './packing/hook.js'

export const plugin: Plugin = {
  hooks: {
    beforeWorkspacePacking,
  },
  commands: defineCommandInvocations({ workspace: [LibraryBuildCommand] }),
}
