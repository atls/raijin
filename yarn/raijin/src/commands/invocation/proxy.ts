import type { PortablePath }                 from '@yarnpkg/fslib'

import type { CommandProxyOptions }          from './invocation.interfaces.js'
import type { ProjectCommandInvocation }     from './invocation.interfaces.js'

import { npath }                             from '@yarnpkg/fslib'

import { COMMAND_INVOCATION_CWD }            from './context.js'
import { COMMAND_PROXY_EXECUTION }           from './context.js'
import { resolveProjectCommandInvocation }   from './context.js'
import { resolveWorkspaceCommandInvocation } from './context.js'
import { executeYarnCommand }                from './executable.js'

export const shouldExecuteCommandProxy = (environment: NodeJS.ProcessEnv = process.env): boolean =>
  environment[COMMAND_PROXY_EXECUTION] !== 'true'

export const createCommandProxyEnvironment = (
  invocationCwd: PortablePath,
  environment: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv => ({
  ...environment,
  [COMMAND_PROXY_EXECUTION]: 'true',
  [COMMAND_INVOCATION_CWD]: npath.fromPortablePath(invocationCwd),
})

const executeCommandProxy = async (
  invocation: ProjectCommandInvocation,
  { args, env, stderr, stdin, stdout }: CommandProxyOptions
): Promise<number> =>
  executeYarnCommand({
    args,
    env: createCommandProxyEnvironment(invocation.invocationCwd, env),
    invocation,
    stderr,
    stdin,
    stdout,
  })

export const executeProjectCommandProxy = async (options: CommandProxyOptions): Promise<number> =>
  executeCommandProxy(await resolveProjectCommandInvocation(options.cwd, options.plugins), options)

export const executeWorkspaceCommandProxy = async (options: CommandProxyOptions): Promise<number> =>
  executeCommandProxy(
    await resolveWorkspaceCommandInvocation(options.cwd, options.plugins),
    options
  )
