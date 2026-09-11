import type { Filename }                 from '@yarnpkg/fslib'

import type { ProcessExecutionResult }   from '../../capabilities/process.interfaces.js'
import type { YarnCommandOptions }       from './execution.interfaces.js'
import type { YarnExecutable }           from './execution.interfaces.js'
import type { YarnExecutableOptions }    from './execution.interfaces.js'

import { scriptUtils }                   from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { applyManagedNodeLoader }        from '@atls/raijin/runtime/node/bootstrap'
import { createLauncherBaseEnvironment } from '@atls/raijin/yarn'
import { isLauncherEnvironmentName }     from '@atls/raijin/yarn'

import { EnvironmentOverrideError }      from '../../exceptions/environment-override.js'
import { toNativeCwd }                   from '../path/index.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename
const OWNED_ENVIRONMENT_NAMES = new Set(['INIT_CWD', 'PROJECT_CWD'])
const OWNED_WINDOWS_ENVIRONMENT_NAMES = new Set(
  Array.from(OWNED_ENVIRONMENT_NAMES, (name) => name.toUpperCase())
)

export const validateEnvironmentPatch = (
  environmentPatch: Readonly<Record<string, string>>,
  platform: NodeJS.Platform = process.platform
): void => {
  for (const name of Object.keys(environmentPatch)) {
    const owned =
      platform === 'win32'
        ? OWNED_WINDOWS_ENVIRONMENT_NAMES.has(name.toUpperCase())
        : OWNED_ENVIRONMENT_NAMES.has(name)

    if (owned || isLauncherEnvironmentName(name, platform)) {
      throw new EnvironmentOverrideError(name)
    }
  }
}

export const createYarnExecutable = async ({
  baseEnvironment,
  binFolder,
  locator,
  project,
  environmentPatch = {},
  nodeLoader,
  nodeOptions,
}: YarnExecutableOptions): Promise<YarnExecutable> => {
  validateEnvironmentPatch(environmentPatch)

  const baseEnv = createLauncherBaseEnvironment({
    ...project.configuration.env,
    ...baseEnvironment,
    ...environmentPatch,
    ...(nodeLoader ? { [MANAGED_NODE_LOADER_ENV]: nodeLoader } : {}),
  })
  const scriptEnv = await scriptUtils.makeScriptEnv({
    baseEnv,
    binFolder,
    locator,
    project,
    ignoreCorepack: true,
  })

  if (nodeOptions === null) {
    Reflect.deleteProperty(scriptEnv, 'NODE_OPTIONS')
  } else if (nodeOptions !== undefined) {
    scriptEnv.NODE_OPTIONS = nodeOptions
  }

  applyManagedNodeLoader(scriptEnv)

  return {
    executable: YARN_EXECUTABLE_NAME,
    env: scriptEnv,
  }
}

export const executeYarnCommand = async ({
  args,
  environment: baseEnvironment,
  executionCwd,
  executor,
  options = {},
  project,
}: YarnCommandOptions): Promise<ProcessExecutionResult> =>
  xfs.mktempPromise(async (binFolder) => {
    const executable = await createYarnExecutable({
      baseEnvironment,
      binFolder,
      locator: options.locator,
      project,
    })
    const environment = executable.env

    environment.INIT_CWD = toNativeCwd(executionCwd)
    environment.PROJECT_CWD = toNativeCwd(project.cwd)

    return executor.execute(executable.executable, args, {
      cwd: toNativeCwd(executionCwd),
      environment,
      input: options.input,
      output: options.output,
      timeoutMs: options.timeoutMs,
    })
  })
