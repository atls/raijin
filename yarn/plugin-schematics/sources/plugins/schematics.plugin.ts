import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { GenerateProjectCommand }   from '../commands/index.js'

export const schematicsPlugin: Plugin = {
  commands: defineCommandInvocations({ project: [GenerateProjectCommand] }),
}
