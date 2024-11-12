import type { Plugin }            from '@yarnpkg/core'

import { beforeWorkspacePacking } from './hooks/index.js'

export const plugin: Plugin = {
  hooks: {
    beforeWorkspacePacking,
  },
}
