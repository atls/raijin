import type { Plugin }                  from '@yarnpkg/core'

import { defineCommandInvocations }     from '@atls/raijin/commands'

import { ChecksLintCommand }            from './checks-lint.command.jsx'
import { ChecksReleaseCommand }         from './checks-release.command.js'
import { ChecksRunCommand }             from './checks-run.command.js'
import { ChecksTestIntegrationCommand } from './checks-test-integration.command.js'
import { ChecksTestUnitCommand }        from './checks-test-unit.command.js'
import { ChecksTypeCheckCommand }       from './checks-typecheck.command.jsx'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    project: [
      ChecksTestIntegrationCommand,
      ChecksTestUnitCommand,
      ChecksTypeCheckCommand,
      ChecksLintCommand,
      ChecksReleaseCommand,
      ChecksRunCommand,
    ],
  }),
}
