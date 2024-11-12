import type { Plugin }            from '@yarnpkg/core'

import { TestIntegrationCommand } from './test-integration.command.js'
import { TestUnitCommand }        from './test-unit.command.js'

export const plugin: Plugin = {
  commands: [TestIntegrationCommand, TestUnitCommand],
}
