import type { Plugin }            from '@yarnpkg/core'

import { afterAllInstalled }      from './hooks/index.js'
import { setupScriptEnvironment } from './hooks/index.js'

export const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
    setupScriptEnvironment,
  },
}
