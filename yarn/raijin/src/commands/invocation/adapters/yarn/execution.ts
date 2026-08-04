import type { Filename }                 from '@yarnpkg/fslib'

import type { CommandExecutionResult }   from '../../resolve.interfaces.js'
import type { YarnCommandOptions }       from './execution.interfaces.js'
import type { YarnExecutable }           from './execution.interfaces.js'
import type { YarnExecutableOptions }    from './execution.interfaces.js'

import { scriptUtils }                   from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { applyManagedNodeLoader }        from '@atls/raijin/runtime/node/bootstrap'
import { createLauncherBaseEnvironment } from '@atls/raijin/yarn'

import { executeChildProcess }           from '../child-process.js'
import { toNativeCwd }                   from '../path/index.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename

export const createYarnExecutable = async ({
  baseEnvironment,
  binFolder,
  locator,
  project,
  env = {},
  nodeLoader,
}: YarnExecutableOptions): Promise<YarnExecutable> => {
  const launcherEnvironment = baseEnvironment ?? project.configuration.env
  const nodeOptions = [launcherEnvironment.NODE_OPTIONS, env.NODE_OPTIONS].filter(Boolean).join(' ')
  const baseEnv = createLauncherBaseEnvironment({
    ...project.configuration.env,
    ...baseEnvironment,
    ...env,
    ...(nodeLoader ? { [MANAGED_NODE_LOADER_ENV]: nodeLoader } : {}),
    ...(nodeOptions ? { NODE_OPTIONS: nodeOptions } : {}),
  })
  const scriptEnv = await scriptUtils.makeScriptEnv({
    baseEnv,
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })

  applyManagedNodeLoader(scriptEnv)

  return {
    executable: YARN_EXECUTABLE_NAME,
    env: scriptEnv,
  }
}

export const executeYarnCommand = async ({
  args,
  context,
  invocation,
  options = {},
}: YarnCommandOptions): Promise<CommandExecutionResult> => {
  const binFolder = await xfs.mktempPromise()
  let executable = await createYarnExecutable({
    baseEnvironment: context.environment,
    binFolder,
    env: options.environment,
    locator: options.locator,
    project: invocation.yarn.project,
  })
  const preparation = await options.prepare?.({
    binFolder,
    environment: executable.env,
  })

  if (preparation) {
    executable = await createYarnExecutable({
      baseEnvironment: context.environment,
      binFolder,
      env: preparation.environment,
      locator: options.locator,
      nodeLoader: preparation.nodeLoader,
      project: invocation.yarn.project,
    })
  }

  const environment = preparation?.finalizeEnvironment
    ? await preparation.finalizeEnvironment(executable.env)
    : executable.env

  environment.INIT_CWD = toNativeCwd(invocation.invocationCwd)
  environment.PROJECT_CWD = toNativeCwd(invocation.project.cwd)

  return executeChildProcess(executable.executable, args, {
    context,
    cwd: toNativeCwd(invocation.executionCwd),
    env: environment,
    input: options.input,
    output: options.output,
    timeout: options.timeout,
  })
}
