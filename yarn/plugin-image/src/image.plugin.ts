import { Plugin }             from '@yarnpkg/core'

import { ImagePackCommand }   from './image-pack.command'
import { ImageSourceCommand } from './image-source.command'

export const plugin: Plugin = {
  commands: [ImagePackCommand, ImageSourceCommand],
}
