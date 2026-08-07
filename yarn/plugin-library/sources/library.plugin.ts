import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { LibraryBuildCommand }      from './library-build.command.jsx'
import { beforeWorkspacePacking }   from './before-workspace-packing.hook.js'

export const plugin: Plugin = {
  hooks: {
    beforeWorkspacePacking,
  },
  commands: defineCommandInvocations({ workspace: [LibraryBuildCommand] }),
}
