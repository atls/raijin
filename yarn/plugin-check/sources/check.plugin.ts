import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { CheckCommand }             from './check.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [CheckCommand] }),
}
