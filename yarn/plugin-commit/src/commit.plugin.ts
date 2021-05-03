import { Plugin }                   from '@yarnpkg/core'

import { CommitMessageLintCommand } from './commit-message-lint.command'
import { CommitStagedCommand }      from './commit-staged.command'
import { CommitCommand }            from './commit.command'

export const plugin: Plugin = {
  commands: [CommitMessageLintCommand, CommitStagedCommand, CommitCommand],
}
