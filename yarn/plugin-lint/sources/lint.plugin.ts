import type { Plugin } from '@yarnpkg/core'

import { LintCommand } from './lint.command.jsx'

export const plugin: Plugin = {
  commands: [LintCommand],
}
