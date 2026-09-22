import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { RendererBuildCommand }     from './build.js'
import { RendererDevCommand }       from './dev.js'
import { RendererStartCommand }     from './start.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [RendererBuildCommand, RendererDevCommand, RendererStartCommand],
  }),
}
