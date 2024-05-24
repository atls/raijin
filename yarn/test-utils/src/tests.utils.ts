import 'pkg-tests-core'

import { WorkspaceResolver } from '@yarnpkg/core'

import { packageUtils }      from './package.utils.js'

export const makeTemporaryEnv = (packageJson, subDefinition?, fn?) =>
  async (...args) => {
    if (packageJson.dependencies) {
      for (const dep of Object.keys(packageJson.dependencies)) {
        if (packageJson.dependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          // eslint-disable-next-line no-await-in-loop, no-param-reassign
          packageJson.dependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    if (packageJson.devDependencies) {
      for (const dep of Object.keys(packageJson.devDependencies)) {
        if (packageJson.devDependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          // eslint-disable-next-line no-await-in-loop, no-param-reassign
          packageJson.devDependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    return global.makeTemporaryEnv(packageJson, subDefinition, fn)(...args)
  }
