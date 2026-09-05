import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { CommitMessageCommand }     from './message/command.jsx'
import { CommitMessageLintCommand } from './message/lint/command.js'
import { CommitStagedCommand }      from './staged/command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    entry: [CommitMessageCommand, CommitStagedCommand],
    project: [CommitMessageLintCommand],
  }),
}
