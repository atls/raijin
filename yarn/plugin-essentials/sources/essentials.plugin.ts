import type { Plugin }       from '@yarnpkg/core'

import { SetVersionCommand } from './commands/index.js'

export const plugin: Plugin = { commands: [SetVersionCommand] }
