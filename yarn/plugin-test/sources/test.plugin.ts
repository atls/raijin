import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { TestIntegrationCommand }   from './test-integration.command.js'
import { TestUnitCommand }          from './test-unit.command.js'
import { TestCommand }              from './test.command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [TestIntegrationCommand, TestUnitCommand, TestCommand],
  }),
}
