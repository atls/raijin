import { YarnVersion }            from '@yarnpkg/core'
import { main }                   from '@yarnpkg/cli'

import { getPluginConfiguration } from './tools'

main({
  binaryVersion: YarnVersion || '<unknown>',
  pluginConfiguration: getPluginConfiguration(),
})
