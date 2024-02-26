import { Plugin }              from '@yarnpkg/core'

import { LibraryBuildCommand } from './library-bulid.command.js'

export const plugin: Plugin = {
  commands: [LibraryBuildCommand],
}
