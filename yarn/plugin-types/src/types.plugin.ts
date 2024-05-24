import type { Plugin }       from '@yarnpkg/core'

import { TypesCheckCommand } from './commands/index.js'

export const plugin: Plugin = {
  commands: [TypesCheckCommand],
}
