import type { Plugin }              from '@yarnpkg/core'

import { ChangelogGenerateCommand } from './changelog-generate.command.js'

export const plugin: Plugin = {
  commands: [ChangelogGenerateCommand],
}
