import type { Plugin }          from '@yarnpkg/core'

import { GenerateIconsCommand } from '@atls/raijin/commands/generate/icons/command'

export const plugin: Plugin = {
  commands: [GenerateIconsCommand],
}
