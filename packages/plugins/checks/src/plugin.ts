import type { Plugin }                  from '@yarnpkg/core'

import { defineCommandInvocations }     from '@atls/raijin/commands'

import { ChecksLintCommand }            from './commands/lint.jsx'
import { ChecksReleaseCommand }         from './commands/release.js'
import { ChecksRunCommand }             from './commands/run.js'
import { ChecksTestIntegrationCommand } from './commands/test/integration.js'
import { ChecksTestUnitCommand }        from './commands/test/unit.js'
import { ChecksTypeCheckCommand }       from './commands/typecheck.jsx'

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
