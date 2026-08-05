import type { Plugin }                from '@yarnpkg/core'

import { defineCommandInvocations }   from '@atls/raijin/commands'

import { ReleaseCreateCommand }       from './release-create.command.js'
import { ReleaseVersionApplyCommand } from './release-version-apply.command.js'
import { ReleaseVersionDeferCommand } from './release-version-defer.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [ReleaseCreateCommand, ReleaseVersionApplyCommand, ReleaseVersionDeferCommand],
  }),
}
