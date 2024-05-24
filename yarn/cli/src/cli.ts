/* eslint-disable @typescript-eslint/no-unsafe-call */

import { YarnVersion }            from '@yarnpkg/core'
import { main }                   from '@yarnpkg/cli'

// @ts-expect-error
import { getPluginConfiguration } from '@atls/yarn-cli-tools'

import packageJson                from '../package.json' assert { type: 'json' }

const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard)

if (pc.then) {
  pc.then(async (pluginConfiguration: ReturnType<getPluginConfiguration>) =>
    main({
      binaryVersion: YarnVersion || '<unknown>',
      pluginConfiguration,
    }))
} else {
  main({
    binaryVersion: YarnVersion || '<unknown>',
    pluginConfiguration: pc,
  })
}
