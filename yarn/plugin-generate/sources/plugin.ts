import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { GenerateIconsCommand }     from './commands/icons.js'
import { GenerateProjectCommand }   from './commands/project.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    project: [GenerateProjectCommand],
    workspace: [GenerateIconsCommand],
  }),
}
