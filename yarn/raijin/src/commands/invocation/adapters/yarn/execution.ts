import type { Filename }                 from '@yarnpkg/fslib'

import type { ProcessExecutionResult }   from '../../execution/process.interfaces.js'
import type { YarnCommandOptions }       from './execution.interfaces.js'
import type { YarnExecutable }           from './execution.interfaces.js'
import type { YarnExecutableOptions }    from './execution.interfaces.js'

import { scriptUtils }                   from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'

import { MANAGED_NODE_LOADER_ENV }       from '@atls/raijin/runtime/node/bootstrap'
import { applyManagedNodeLoader }        from '@atls/raijin/runtime/node/bootstrap'
import { createLauncherBaseEnvironment } from '@atls/raijin/yarn'

import { executeProcess }                from '../execa/execute.js'
import { toNativeCwd }                   from '../path/index.js'

const YARN_EXECUTABLE_NAME = (process.platform === 'win32' ? 'yarn.cmd' : 'yarn') as Filename
const OWNED_ENVIRONMENT_NAMES = new Set([
  'BERRY_BIN_FOLDER',
  'INIT_CWD',
  'NODE_OPTIONS',
  'PROJECT_CWD',
  'RAIJIN_NODE_LOADER',
  'YARN_IGNORE_PATH',
  'npm_config_user_agent',
  'npm_execpath',
])

const validateEnvironmentPatch = (environmentPatch: Readonly<Record<string, string>>): void => {
  for (const name of Object.keys(environmentPatch)) {
    if (OWNED_ENVIRONMENT_NAMES.has(name) || name.toUpperCase() === 'PATH') {
      throw new Error(`Yarn command preparation cannot override ${name}`)
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
  context,
  executionCwd,
  options = {},
  project,
}: YarnCommandOptions): Promise<ProcessExecutionResult> => {
  const binFolder = await xfs.mktempPromise()
  let executable = await createYarnExecutable({
    baseEnvironment: context.environment,
    binFolder,
    locator: options.locator,
    project,
  })
  const preparation = await options.prepare?.({
    binFolder,
    nodeOptions: executable.env.NODE_OPTIONS,
  })

  if (preparation) {
    executable = await createYarnExecutable({
      baseEnvironment: context.environment,
      binFolder,
      environmentPatch: preparation.environmentPatch,
      locator: options.locator,
      nodeLoader: preparation.nodeLoader,
      nodeOptions: preparation.nodeOptions,
      project,
    })
  }

  const environment = executable.env

  environment.INIT_CWD = toNativeCwd(executionCwd)
  environment.PROJECT_CWD = toNativeCwd(project.cwd)

  return executeProcess(executable.executable, args, {
    context,
    cwd: toNativeCwd(executionCwd),
    env: environment,
    input: options.input,
    output: options.output,
    signal: options.signal,
    timeout: options.timeout,
  })
}
