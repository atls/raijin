import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { GenerateProjectCommand }   from './commands/project.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ project: [GenerateProjectCommand] }),
}
