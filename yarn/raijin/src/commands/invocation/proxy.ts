import type { CommandProxyOptions }          from './invocation.interfaces.js'
import type { ProjectCommandInvocation }     from './invocation.interfaces.js'

import { COMMAND_PROXY_EXECUTION }           from './proxy-state.js'
import { resolveProjectCommandInvocation }   from './context.js'
import { resolveWorkspaceCommandInvocation } from './context.js'
import { executeYarnCommand }                from './executable.js'
import { createCommandProxyEnvironment }     from './proxy-state.js'

export const shouldExecuteCommandProxy = (environment: NodeJS.ProcessEnv = process.env): boolean =>
  environment[COMMAND_PROXY_EXECUTION] !== 'true'

const executeCommandProxy = async (
  invocation: ProjectCommandInvocation,
  { args, env, stderr, stdin, stdout }: CommandProxyOptions
): Promise<number> =>
  executeYarnCommand({
    args,
    env: createCommandProxyEnvironment(invocation.cwd.invocation.native, env),
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
