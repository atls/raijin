import { Plugin }        from '@yarnpkg/core'

import { FormatCommand } from './format.command.js'

export const plugin: Plugin = {
  commands: [FormatCommand],
}
