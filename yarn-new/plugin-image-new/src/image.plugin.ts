import { Plugin }           from '@yarnpkg/core'

import { ImagePackCommand } from './image-pack.command'

export const plugin: Plugin = {
  commands: [ImagePackCommand],
}
