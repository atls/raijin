import type { Plugin }      from '@yarnpkg/core'

import { ImagePackCommand } from './image-pack.command.js'

export const plugin: Plugin = {
  commands: [ImagePackCommand],
}
