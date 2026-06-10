import type { Plugin }                from '@yarnpkg/core'

import { ReleaseCreateCommand }       from './release-create.command.js'
import { ReleaseVersionDeferCommand } from './release-version-defer.command.js'

export const plugin: Plugin = {
  commands: [ReleaseCreateCommand, ReleaseVersionDeferCommand],
}
