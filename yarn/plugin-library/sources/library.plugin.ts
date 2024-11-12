import type { Plugin }            from '@yarnpkg/core'

import { LibraryBuildCommand }    from './library-build.command.jsx'
import { beforeWorkspacePacking } from './before-workspace-packing.hook.js'

export const plugin: Plugin = {
  hooks: {
    beforeWorkspacePacking,
  },
  commands: [LibraryBuildCommand],
}
