import type { Plugin }    from '@yarnpkg/core'

import { ProjectCommand } from './commands/project.js'

export const generatePlugin: Plugin = {
  commands: [ProjectCommand],
}
