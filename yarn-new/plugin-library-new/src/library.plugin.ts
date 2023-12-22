import { Plugin }              from '@yarnpkg/core'

import { LibraryBuildCommand } from './library-bulid.command'

export const plugin: Plugin = {
  commands: [LibraryBuildCommand],
}
