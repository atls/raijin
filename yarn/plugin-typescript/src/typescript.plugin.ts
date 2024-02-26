import { Plugin }           from '@yarnpkg/core'

import { TypeCheckCommand } from './typecheck.command.js'

export const plugin: Plugin = {
  commands: [TypeCheckCommand],
}
