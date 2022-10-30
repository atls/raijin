import { Plugin }        from '@yarnpkg/core'

import { BadgesCommand } from './badges.command'

export const plugin: Plugin = {
  commands: [BadgesCommand],
}
