import type { Plugin }            from '@yarnpkg/core'

import { TestIntegrationCommand } from './test-integration.command.js'
import { TestUnitCommand }        from './test-unit.command.js'
import { TestCommand }            from './test.command.js'

export const plugin: Plugin = {
  commands: [TestIntegrationCommand, TestUnitCommand, TestCommand],
}
