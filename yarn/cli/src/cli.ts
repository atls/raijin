import { YarnVersion }            from '@yarnpkg/core'
import { main }                   from '@yarnpkg/cli'

// @ts-ignore
import { getPluginConfiguration } from '@atls/yarn-cli-tools'

import packageJson                from '../package.json' assert { type: 'json' }

const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard as Array<string>)

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
