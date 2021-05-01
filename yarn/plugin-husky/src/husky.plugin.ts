import { Plugin }            from '@yarnpkg/core'

import { afterAllInstalled } from './after-all-installed.hook'

export const plugin: Plugin = {
  hooks: {
    afterAllInstalled,
  },
}
