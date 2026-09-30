import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { FormatCommand }            from './command.jsx'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [FormatCommand] }),
}
