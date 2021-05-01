import { Plugin }                 from '@yarnpkg/core'

import { TestIntegrationCommand } from './test-integration.command'
import { TestUnitCommand }        from './test-unit.command'

export const plugin: Plugin = {
  commands: [TestIntegrationCommand, TestUnitCommand],
}
