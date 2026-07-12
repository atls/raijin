import type { PortablePath } from '@yarnpkg/fslib'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

export const COMMAND_INVOCATION_CWD = 'RAIJIN_COMMAND_INVOCATION_CWD'
export const COMMAND_PROXY_EXECUTION = 'RAIJIN_COMMAND_PROXY_EXECUTION'

const resolveInitCwd = (cwd: PortablePath, environment: NodeJS.ProcessEnv): PortablePath => {
  const initCwd = environment.INIT_CWD

  if (initCwd) {
    const portableInitCwd = npath.toPortablePath(initCwd)

    if (ppath.contains(cwd, portableInitCwd) !== null) {
      return portableInitCwd
    }
  }

  return cwd
}

export const consumeCommandInvocationCwd = (
  cwd: PortablePath,
  environment: NodeJS.ProcessEnv
): PortablePath => {
  const isProxyExecution = environment[COMMAND_PROXY_EXECUTION] === 'true'
  const invocationCwd = environment[COMMAND_INVOCATION_CWD]

  Reflect.deleteProperty(environment, COMMAND_PROXY_EXECUTION)
  Reflect.deleteProperty(environment, COMMAND_INVOCATION_CWD)

  if (!isProxyExecution) {
    return resolveInitCwd(cwd, environment)
  }

  if (!invocationCwd) {
    throw new Error('Command proxy invocation cwd is missing')
  }

  return npath.toPortablePath(invocationCwd)
}

export const createCommandProxyEnvironment = (
  invocationCwd: string,
  environment: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv => ({
  ...environment,
  [COMMAND_INVOCATION_CWD]: invocationCwd,
  [COMMAND_PROXY_EXECUTION]: 'true',
})
