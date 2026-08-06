import type { Locator }                        from '@yarnpkg/core'
import type { Project }                        from '@yarnpkg/core'
import type { Filename }                       from '@yarnpkg/fslib'
import type { PortablePath }                   from '@yarnpkg/fslib'

import { scriptUtils }                         from '@yarnpkg/core'
import { npath }                               from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }             from '@atls/raijin/runtime/node/bootstrap'
import { materializeNextConfigAdapter }        from '@atls/raijin/config/next'
import { applyManagedNodeLoader }              from '@atls/raijin/runtime/node/bootstrap'
import { createLauncherBaseEnvironment }       from '@atls/raijin/yarn'

import { createNextExecutionEnvironmentPatch } from './environment.js'
import { extractPnpLoaderOption }              from './environment.js'
import { resolvePnpLoader }                    from './environment.js'
import { materializeNextLoader }               from './loader.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename

interface NextExecutableOptions {
  baseEnvironment: NodeJS.ProcessEnv
  binFolder: PortablePath
  locator: Locator
  output?: 'standalone'
  project: Project
  rendererCwd: PortablePath
}

export const createNextExecutable = async ({
  baseEnvironment,
  binFolder,
  locator,
  output,
  project,
  rendererCwd,
}: NextExecutableOptions): Promise<{ env: NodeJS.ProcessEnv; executable: Filename }> => {
  const initialEnvironment = await scriptUtils.makeScriptEnv({
    baseEnv: createLauncherBaseEnvironment({
      ...project.configuration.env,
      ...baseEnvironment,
    }),
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })
  const { nodeOptions } = extractPnpLoaderOption(initialEnvironment.NODE_OPTIONS)
  const loader = await resolvePnpLoader(project.cwd, initialEnvironment.NODE_OPTIONS)
  const nextLoader = await materializeNextLoader(binFolder, loader)
  const nextConfigAdapterPath = await materializeNextConfigAdapter({ cwd: binFolder })
  const environmentPatch = createNextExecutionEnvironmentPatch(rendererCwd, {
    nextConfigAdapterPath,
    output,
  })
  const environment = await scriptUtils.makeScriptEnv({
    baseEnv: createLauncherBaseEnvironment({
      ...project.configuration.env,
      ...baseEnvironment,
      ...environmentPatch,
      [MANAGED_NODE_LOADER_ENV]: nextLoader,
    }),
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })

  if (nodeOptions) {
    environment.NODE_OPTIONS = nodeOptions
  } else {
    Reflect.deleteProperty(environment, 'NODE_OPTIONS')
  }

  applyManagedNodeLoader(environment)

  environment.INIT_CWD = npath.fromPortablePath(rendererCwd)
  environment.PROJECT_CWD = npath.fromPortablePath(project.cwd)

  return { env: environment, executable: YARN_EXECUTABLE_NAME }
}
