import type { Plugin }          from '@yarnpkg/core'

import { ReleaseCreateCommand } from './release-create.command.js'

export const plugin: Plugin = {
  commands: [ReleaseCreateCommand],
}
