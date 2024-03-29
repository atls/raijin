import { Plugin }                   from '@yarnpkg/core'

import { CommitMessageLintCommand } from './commit-message-lint.command.js'
import { CommitMessageCommand }     from './commit-message.command.jsx'
import { CommitStagedCommand }      from './commit-staged.command.js'

export const plugin: Plugin = {
  commands: [CommitMessageCommand, CommitMessageLintCommand, CommitStagedCommand],
}
