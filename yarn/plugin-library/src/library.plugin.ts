import { Plugin }              from '@yarnpkg/core'

import { LibraryBuildCommand } from './library-bulid.command.jsx'

export const plugin: Plugin = {
  commands: [LibraryBuildCommand],
}
