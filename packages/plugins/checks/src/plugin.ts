import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ChecksRunCommand }         from './commands/run.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    project: [ChecksRunCommand],
  }),
}
