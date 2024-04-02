// @ts-ignore
import { getPluginConfiguration } from '@atls/yarn-cli-tools'
import { runExit }                from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'
import * as process               from 'process'

import packageJson                from '../package.json' assert { type: 'json' }

const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard as Array<string>)

if (pc.then) {
  pc.then((pluginConfiguration) => {
    runExit(process.argv.slice(2), {
      cwd: ppath.cwd(),
      selfPath: npath.toPortablePath(npath.resolve(process.argv[1])),
      pluginConfiguration,
    })
  })
} else {
  runExit(process.argv.slice(2), {
    cwd: ppath.cwd(),
    selfPath: npath.toPortablePath(npath.resolve(process.argv[1])),
    pluginConfiguration: pc,
  })

}
