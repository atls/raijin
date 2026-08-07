import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { RendererBuildCommand }     from './commands/index.js'
import { RendererDevCommand }       from './commands/index.js'
import { RendererStartCommand }     from './commands/index.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [RendererBuildCommand, RendererDevCommand, RendererStartCommand],
  }),
}
