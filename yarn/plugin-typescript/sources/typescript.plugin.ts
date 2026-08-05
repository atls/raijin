import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { TypeCheckCommand }         from './typecheck.command.jsx'

export const plugin: Plugin = {
  commands: defineCommandInvocations({ workspace: [TypeCheckCommand] }),
}
