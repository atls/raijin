import type { Plugin }      from '@yarnpkg/core'

import { TypeCheckCommand } from './typecheck.command.jsx'

export const plugin: Plugin = {
  commands: [TypeCheckCommand],
}
