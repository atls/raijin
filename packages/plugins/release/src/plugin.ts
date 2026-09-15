import type { Plugin }                from '@yarnpkg/core'

import { defineCommandInvocations }   from '@atls/raijin/commands'

import { ReleaseCreateCommand }       from './commands/create.js'
import { ReleaseVersionApplyCommand } from './commands/version/apply.js'
import { ReleaseVersionDeferCommand } from './commands/version/defer.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [ReleaseCreateCommand, ReleaseVersionApplyCommand, ReleaseVersionDeferCommand],
  }),
}
