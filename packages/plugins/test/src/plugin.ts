import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { TestCommand }              from './command.js'
import { TestIntegrationCommand }   from './command.js'
import { TestUnitCommand }          from './command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [TestIntegrationCommand, TestUnitCommand, TestCommand],
  }),
}
