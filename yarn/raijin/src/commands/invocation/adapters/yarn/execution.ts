import type { Filename }                 from '@yarnpkg/fslib'

import type { YarnCommandOptions }       from './execution.interfaces.js'
import type { YarnExecutable }           from './execution.interfaces.js'
import type { YarnExecutableOptions }    from './execution.interfaces.js'

import { execUtils }                     from '@yarnpkg/core'
import { scriptUtils }                   from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { applyManagedNodeLoader }        from '@atls/raijin/runtime/node/bootstrap'
import { createLauncherBaseEnvironment } from '@atls/raijin/yarn'

import { toNativeCwd }                   from '../path/index.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename

export const createYarnExecutable = async ({
  binFolder,
  locator,
  project,
  env = {},
  nodeLoader,
}: YarnExecutableOptions): Promise<YarnExecutable> => {
  const nodeOptions = [project.configuration.env.NODE_OPTIONS, env.NODE_OPTIONS]
    .filter(Boolean)
    .join(' ')
  const baseEnv = createLauncherBaseEnvironment({
    ...project.configuration.env,
    ...env,
    ...(nodeLoader ? { [MANAGED_NODE_LOADER_ENV]: nodeLoader } : {}),
    ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
  })
  const scriptEnv = await scriptUtils.makeScriptEnv({
    baseEnv,
    binFolder,
    locator,
    project,
    ignoreCorepack: false,
  })

  applyManagedNodeLoader(scriptEnv)

  return {
    executable: YARN_EXECUTABLE_NAME,
    env: scriptEnv,
  }
}

export const executeYarnCommand = async ({
  args,
  env,
  invocation,
  stderr,
  stdin,
  stdout,
}: YarnCommandOptions): Promise<number> => {
  const binFolder = await xfs.mktempPromise()
  const executable = await createYarnExecutable({
    binFolder,
    env,
    project: invocation.yarn.project,
  })
  executable.env.INIT_CWD = toNativeCwd(invocation.invocationCwd)
  executable.env.PROJECT_CWD = toNativeCwd(invocation.project.cwd)

  const { code } = await execUtils.pipevp(executable.executable, args, {
    cwd: invocation.executionCwd,
    env: executable.env,
    stderr,
    stdin,
    stdout,
  })

  return code
}
