import { Plugin }       from '@yarnpkg/core'

import { CheckCommand } from './check.command'

export const plugin: Plugin = {
  commands: [CheckCommand],
}
