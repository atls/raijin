/* eslint-disable @typescript-eslint/no-unsafe-call */

import { join }                   from 'node:path'

import { runExit }                from '@yarnpkg/cli'
import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'

// @ts-expect-error: Cjs export
import { getPluginConfiguration } from '@atls/yarn-cli-tools'

import { addPrefix }              from './version-patches.js'
import { updatePackageJsonFile }  from './version-patches.js'
import { removePrefix }           from './version-patches.js'
import packageJson                from '../package.json' with { type: 'json' }

const pc = getPluginConfiguration(packageJson['@yarnpkg/builder'].bundles.standard)

const modifiedPackageJson = addPrefix(packageJson)

const selfPath = npath.toPortablePath(npath.resolve(process.argv[1]))

// @ts-expect-error iterator
const [bundleBuildScript, _] = Object.entries(packageJson.scripts).find(([script, run]) =>
  run.includes('builder build bundle'))

const isBuild = process.argv.includes(bundleBuildScript)

const packageJsonPath = join(selfPath, '../../', 'package.json')
if (isBuild) {
  updatePackageJsonFile(packageJsonPath, modifiedPackageJson)
}

if (pc.then) {
  pc.then(async (pluginConfiguration: ReturnType<getPluginConfiguration>) => {
    runExit(process.argv.slice(2), {
      cwd: ppath.cwd(),
      selfPath,
      pluginConfiguration,
    })
  })

  if (!isBuild) {
    const initialPackageJson = removePrefix(modifiedPackageJson)
    updatePackageJsonFile(packageJsonPath, initialPackageJson)
  }
} else {
  runExit(process.argv.slice(2), {
    cwd: ppath.cwd(),
    selfPath,
    pluginConfiguration: pc,
  })

  if (!isBuild) {
    const initialPackageJson = removePrefix(modifiedPackageJson)
    updatePackageJsonFile(packageJsonPath, initialPackageJson)
  }
}
