import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { CommitMessageLintCommand } from './commit-message-lint.command.js'
import { CommitMessageCommand }     from './commit-message.command.jsx'
import { CommitStagedCommand }      from './commit-staged.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    entry: [CommitMessageCommand, CommitStagedCommand],
    project: [CommitMessageLintCommand],
  }),
}
