import type { Configuration }         from '@yarnpkg/core'
import type { PortablePath }          from '@yarnpkg/fslib'
import type { Readable }              from 'node:stream'
import type { Writable }              from 'node:stream'

import type { ProjectInvocation }     from './resolve.js'

import { INVOCATION_CWD_ENV }         from './resolve.js'
import { PROXY_ENV }                  from './resolve.js'
import { toNativeCwd }                from './adapters/path/index.js'
import { executeYarnCommand }         from './adapters/yarn/execution.js'
import { resolveProjectInvocation }   from './resolve.js'
import { resolveWorkspaceInvocation } from './resolve.js'

interface ProxyOptions {
  args: Array<string>
  cwd: PortablePath
  plugins: Parameters<typeof Configuration.find>[1]
  stderr: Writable
  stdin: Readable
  stdout: Writable
  env?: NodeJS.ProcessEnv
}

export const shouldProxyCommand = (environment: NodeJS.ProcessEnv = process.env): boolean =>
  environment[PROXY_ENV] !== 'true'

export const createProxyEnvironment = (
  invocationCwd: PortablePath,
  environment: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv => ({
  ...environment,
  [INVOCATION_CWD_ENV]: toNativeCwd(invocationCwd),
  [PROXY_ENV]: 'true',
})

const proxyCommand = async (
  invocation: ProjectInvocation,
  { args, env, stderr, stdin, stdout }: ProxyOptions
): Promise<number> =>
  executeYarnCommand({
    args,
    env: createProxyEnvironment(invocation.invocationCwd, env),
    invocation,
    stderr,
    stdin,
    stdout,
  })

export const proxyProjectCommand = async (options: ProxyOptions): Promise<number> =>
  proxyCommand(await resolveProjectInvocation(options.cwd, options.plugins), options)

export const proxyWorkspaceCommand = async (options: ProxyOptions): Promise<number> =>
  proxyCommand(await resolveWorkspaceInvocation(options.cwd, options.plugins), options)
