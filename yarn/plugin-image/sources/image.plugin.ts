import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ImagePackCommand }         from './image-pack.command.js'
import { WorkspacesResolveCommand } from './workspaces-resolve.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    project: [WorkspacesResolveCommand],
    workspace: [ImagePackCommand],
  }),
}
