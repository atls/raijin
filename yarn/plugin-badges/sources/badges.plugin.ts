import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { BadgesCommand }            from './badges.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [BadgesCommand] }),
}
