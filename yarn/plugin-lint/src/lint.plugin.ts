import { Plugin }      from '@yarnpkg/core'

import { LintCommand } from './lint.command.js'

export const plugin: Plugin = {
  commands: [LintCommand],
}
