import type { Hooks as CoreHooks } from '@yarnpkg/core'
import type { Plugin }             from '@yarnpkg/core'

import { xfs }                     from '@yarnpkg/fslib'
import { getPnpPath }              from '@yarnpkg/plugin-pnp'

import { getContent }              from './esm-loader/loader.content.js'

const plugin: Plugin<CoreHooks> = {
  hooks: {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async afterAllInstalled(project) {
      const { esmLoader } = getPnpPath(project)

      if (await xfs.existsPromise(esmLoader)) {
        await xfs.changeFilePromise(esmLoader, getContent(), {
          automaticNewlines: true,
          mode: 0o644,
        })
      }
    },
  },
}

export default plugin
