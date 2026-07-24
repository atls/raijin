import type { Plugin } from '@yarnpkg/core'

import { Command }     from './project/command.js'

export const generatePlugin: Plugin = {
  commands: [Command],
}
