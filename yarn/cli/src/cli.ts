/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { PluginConfiguration }  from '@yarnpkg/core'

import { runExit }                   from '@yarnpkg/cli'
import { npath }                     from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'

// @ts-expect-error: Cjs export
import { getPluginConfiguration }    from '@atls/yarn-cli-tools'

import { createCliSurfaceInventory } from './surface/inventory.js'
import packageJson from '../package.json' with { type: 'json' }

const selfPath = npath.toPortablePath(npath.resolve(process.argv[1]))
const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard)

if (process.env.RAIJIN_CLI_INVENTORY === '1') {
  Promise.resolve(pc).then(async (pluginConfiguration: PluginConfiguration) => {
    const inventory = await createCliSurfaceInventory({
      cwd: ppath.cwd(),
      pluginConfiguration,
    })

    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
  })
} else if (pc.then) {
  pc.then(async (pluginConfiguration: PluginConfiguration) => {
    runExit(process.argv.slice(2), {
      cwd: ppath.cwd(),
      selfPath,
      pluginConfiguration,
    })
  })
} else {
  runExit(process.argv.slice(2), {
    cwd: ppath.cwd(),
    selfPath,
    pluginConfiguration: pc,
  })
}
