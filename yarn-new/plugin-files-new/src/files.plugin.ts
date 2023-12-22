import { Plugin }                  from '@yarnpkg/core'

import { FilesChangedListCommand } from './files-changed-list.command'

export const plugin: Plugin = {
  commands: [FilesChangedListCommand],
}
