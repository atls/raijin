import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { GenerateIconsCommand }     from './icons.js'
import { GenerateProjectCommand }   from './project.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    project: [GenerateProjectCommand],
    workspace: [GenerateIconsCommand],
  }),
}
