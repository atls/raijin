import type { ChildProcess }        from 'node:child_process'
import type { SpawnOptions }        from 'node:child_process'

import type { ChildProcessOptions } from './child-process.interfaces.js'

import { toNativeCwd }              from './path/index.js'

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
