import type { Plugin }  from '@yarnpkg/core'

import { CheckCommand } from './check.command.js'

export const plugin: Plugin = {
  commands: [CheckCommand],
}
