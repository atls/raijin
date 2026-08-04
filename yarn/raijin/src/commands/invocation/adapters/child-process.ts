import type { ChildProcess }           from 'node:child_process'
import type { SpawnOptions }           from 'node:child_process'

import type { ProjectInvocation }      from '../resolve.interfaces.js'
import type { ChildProcessOptions }    from './child-process.interfaces.js'
import type { ChildProcessRunOptions } from './child-process.interfaces.js'

import { spawn }                       from 'node:child_process'

import { toNativeCwd }                 from './path/index.js'

export const createChildProcessOptions = ({
  env,
  invocation,
  stdio,
}: ChildProcessOptions): SpawnOptions => ({
  cwd: toNativeCwd(invocation.executionCwd),
  env,
  stdio,
})

export const waitForChildProcess = async (child: ChildProcess): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => {
      resolve(code ?? 1)
    })
  })

export const spawnChildProcess = (
  invocation: ProjectInvocation,
  command: string,
  args: Array<string>,
  options: ChildProcessRunOptions
): ChildProcess =>
  spawn(
    command,
    args,
    createChildProcessOptions({
      invocation,
      env: options.env,
      stdio: options.stdio,
    })
  )
