import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ProducerCommand }          from './child/produce.js'
import { TestCommand }              from './commands/all.js'
import { TestIntegrationCommand }   from './commands/integration.js'
import { TestUnitCommand }          from './commands/unit.js'

const commands = defineCommandInvocations({
  workspace: [TestIntegrationCommand, TestUnitCommand, TestCommand],
})

if (process.connected && typeof process.send === 'function') {
  commands.push(ProducerCommand)
}

export const plugin: Plugin = {
  commands,
}
