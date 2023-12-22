import { Plugin }      from '@yarnpkg/core'

import { LintCommand } from './lint.command'

export const plugin: Plugin = {
  commands: [LintCommand],
}
