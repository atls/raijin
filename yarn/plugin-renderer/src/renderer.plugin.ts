import type { Plugin }          from '@yarnpkg/core'

import { RendererBuildCommand } from './commands/index.js'
import { RendererDevCommand }   from './commands/index.js'

export const plugin: Plugin = {
  commands: [RendererBuildCommand, RendererDevCommand],
}
