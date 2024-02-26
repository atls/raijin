import { Plugin }                       from '@yarnpkg/core'

import { ChecksLintCommand }            from './checks-lint.command.js'
import { ChecksReleaseCommand }         from './checks-release.command.js'
import { ChecksRunCommand }             from './checks-run.command.js'
import { ChecksTestIntegrationCommand } from './checks-test-integration.command.js'
import { ChecksTestUnitCommand }        from './checks-test-unit.command.js'
import { ChecksTypeCheckCommand }       from './checks-typecheck.command.js'

export const plugin: Plugin = {
  commands: [
    ChecksTestIntegrationCommand,
    ChecksTestUnitCommand,
    ChecksTypeCheckCommand,
    ChecksLintCommand,
    ChecksReleaseCommand,
    ChecksRunCommand,
  ],
}
