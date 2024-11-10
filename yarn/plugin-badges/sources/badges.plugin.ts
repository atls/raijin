import type { Plugin }   from '@yarnpkg/core'

import { BadgesCommand } from './badges.command.js'

export const plugin: Plugin = {
  commands: [BadgesCommand],
}
