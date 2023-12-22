import { Plugin }           from '@yarnpkg/core'

import { TypeCheckCommand } from './typecheck.command'

export const plugin: Plugin = {
  commands: [TypeCheckCommand],
}
