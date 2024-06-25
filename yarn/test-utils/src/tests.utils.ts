import 'pkg-tests-core'

import type { tests }        from 'pkg-tests-core'

import { WorkspaceResolver } from '@yarnpkg/core'

import { packageUtils }      from './package.utils.js'

export const makeTemporaryEnv = (
    packageJson: Record<string, any> | tests.RunFunction,
    subDefinition: Record<string, any> | tests.RunFunction,
    fn?: tests.RunFunction | undefined
  ) =>
  async (...args: Array<any>): Promise<Array<any>> => {
    const { dependencies } = (packageJson as Record<string, Record<string, string>>) || {}
    const { devDependencies } = (packageJson as Record<string, Record<string, string>>) || {}

    if (dependencies) {
      for (const dep of Object.keys(dependencies)) {
        if (dependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          // eslint-disable-next-line no-await-in-loop
          dependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    if (devDependencies) {
      for (const dep of Object.keys(devDependencies)) {
        if (devDependencies[dep].startsWith(WorkspaceResolver.protocol)) {
          // eslint-disable-next-line no-await-in-loop
          devDependencies[dep] = await packageUtils.pack(dep)
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return
    return global.makeTemporaryEnv(packageJson, subDefinition, fn)(...args)
  }
