import { Plugin }                       from '@yarnpkg/core'

import { ChecksTypeCheckCommand }       from './checks-typecheck.command'
import { ChecksLintCommand }            from './checks-lint.command'
import { ChecksReleaseCommand }         from './checks-release.command'

export const plugin: Plugin = {
  commands: [
    ChecksTypeCheckCommand,
    ChecksLintCommand,
    ChecksReleaseCommand,
  ],
}
