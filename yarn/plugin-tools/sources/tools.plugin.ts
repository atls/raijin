import type { Plugin }       from '@yarnpkg/core'

import { afterAllInstalled } from './hooks/index.js'

export const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
  },
}
