import type { Plugin }   from '@yarnpkg/core'

import { FormatCommand } from './format.command.jsx'

export const plugin: Plugin = {
  commands: [FormatCommand],
}
