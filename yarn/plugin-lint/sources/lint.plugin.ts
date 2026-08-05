import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { LintCommand }              from './lint.command.jsx'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [LintCommand] }),
}
