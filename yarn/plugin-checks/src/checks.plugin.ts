import { Plugin }                       from '@yarnpkg/core'

import { ChecksTypeCheckCommand }       from './checks-typecheck.command'
import { ChecksLintCommand }            from './checks-lint.command'
import { ChecksTestUnitCommand }        from './checks-test-unit.command'
import { ChecksTestIntegrationCommand } from './checks-test-integration.command'
import { ChecksReleaseCommand }         from './checks-release.command'

export const plugin: Plugin = {
  commands: [
    ChecksTestIntegrationCommand,
    ChecksTestUnitCommand,
    ChecksTypeCheckCommand,
    ChecksLintCommand,
    ChecksReleaseCommand,
  ],
}
