import type { Plugin }            from '@yarnpkg/core'

import { GenerateProjectCommand } from '@atls/raijin/commands/generate/project/command'

export const schematicsPlugin: Plugin = {
  commands: [GenerateProjectCommand],
}
