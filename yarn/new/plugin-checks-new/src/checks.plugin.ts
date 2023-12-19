import { Plugin }                       from '@yarnpkg/core'

import { ChecksLintCommand }            from './checks-lint.command'
import { ChecksReleaseCommand }         from './checks-release.command'
import { ChecksRunCommand }             from './checks-run.command'
import { ChecksTestIntegrationCommand } from './checks-test-integration.command'
import { ChecksTestUnitCommand }        from './checks-test-unit.command'
import { ChecksTypeCheckCommand }       from './checks-typecheck.command'

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
