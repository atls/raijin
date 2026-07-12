import type { ChildProcess }             from 'node:child_process'
import type { SpawnOptions }             from 'node:child_process'

import type { CommandChildOptions }      from './invocation.interfaces.js'

import { resolveCommandPlatformAdapter } from './platform/index.js'

export const createCommandChildProcessOptions = ({
  env,
  invocation,
  stdio,
}: CommandChildOptions): SpawnOptions => ({
  cwd: resolveCommandPlatformAdapter().resolveNativeCwd(invocation.executionCwd),
  env,
  stdio,
})

export const waitForCommandChild = async (child: ChildProcess): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', (code) => {
      resolve(code ?? 1)
    })
  })
