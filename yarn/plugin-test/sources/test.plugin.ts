import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ProducerCommand }          from './execution/producer.command.js'
import { TestIntegrationCommand }   from './test-integration.command.js'
import { TestUnitCommand }          from './test-unit.command.js'
import { TestCommand }              from './test.command.js'

const commands = defineCommandInvocations({
  workspace: [TestIntegrationCommand, TestUnitCommand, TestCommand],
})

if (process.connected && typeof process.send === 'function') {
  commands.push(ProducerCommand)
}

export const plugin: Plugin = {
  commands,
}
