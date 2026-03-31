import type { Plugin }            from '@yarnpkg/core'

import { GenerateProjectCommand } from '../commands/index.js'

export const schematicsPlugin: Plugin = {
  commands: [GenerateProjectCommand],
}
