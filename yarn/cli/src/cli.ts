import { YarnVersion }            from '@yarnpkg/core'
import { main }                   from '@yarnpkg/cli'

// @ts-ignore
import { getPluginConfiguration } from '@atls/yarn-cli-tools'

import packageJson                from '../package.json' assert { type: 'json' }

const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard as Array<string>)

// TODO: after bump to yarn 4 switch to runExit https://github.com/yarnpkg/berry/commit/981d5bbbff6ae228825480f699071a10f3522964#diff-1f3630391b464556b5e5d1a7541d279ecf383e2d0773d8ba5386ba16bf29c4ac
if (pc.then) {
  pc.then((pluginConfiguration) => {
    main({
      binaryVersion: YarnVersion || '<unknown>',
      pluginConfiguration,
    })
  })
} else {
  main({
    binaryVersion: YarnVersion || '<unknown>',
    pluginConfiguration: pc,
  })
}
