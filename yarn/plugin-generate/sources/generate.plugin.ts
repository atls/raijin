import type { Plugin }            from '@yarnpkg/core'

import { GenerateProjectCommand } from './project/generate-project.command.js'

export const generatePlugin: Plugin = {
  commands: [GenerateProjectCommand],
}
