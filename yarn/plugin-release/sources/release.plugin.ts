import type { Plugin }                from '@yarnpkg/core'

import { ReleaseCreateCommand }       from './release-create.command.js'
import { ReleasePlanCreateCommand }   from './release-plan-create.command.js'
import { ReleasePlanForeachCommand }  from './release-plan-foreach.command.js'
import { ReleaseVersionDeferCommand } from './release-version-defer.command.js'

export const plugin: Plugin = {
  commands: [
    ReleaseCreateCommand,
    ReleasePlanCreateCommand,
    ReleasePlanForeachCommand,
    ReleaseVersionDeferCommand,
  ],
}
