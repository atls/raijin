import { Plugin }        from '@yarnpkg/core'

import { FormatCommand } from './format.command'

export const plugin: Plugin = {
  commands: [FormatCommand],
}
