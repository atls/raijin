import './polyfills'

import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'

import { runExit }                from './lib.js'
import { getPluginConfiguration } from './tools/getPluginConfiguration.js'

runExit(process.argv.slice(2), {
  cwd: ppath.cwd(),
  selfPath: npath.toPortablePath(npath.resolve(process.argv[1])),
  pluginConfiguration: getPluginConfiguration(),
})
