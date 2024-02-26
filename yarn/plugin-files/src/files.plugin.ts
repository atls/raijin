import { Plugin }                  from '@yarnpkg/core'

import { FilesChangedListCommand } from './files-changed-list.command.js'

export const plugin: Plugin = {
  commands: [FilesChangedListCommand],
}
