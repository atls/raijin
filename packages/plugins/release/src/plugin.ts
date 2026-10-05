import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { InferVersionsCommand }     from './command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [InferVersionsCommand] }),
}
