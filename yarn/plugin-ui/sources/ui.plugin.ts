import type { Plugin }            from '@yarnpkg/core'

import { UiIconsGenerateCommand } from './commands/index.js'

export const plugin: Plugin = {
  commands: [UiIconsGenerateCommand],
}
