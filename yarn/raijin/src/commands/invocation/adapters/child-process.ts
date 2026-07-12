import type { ChildProcess }      from 'node:child_process'
import type { SpawnOptions }      from 'node:child_process'

import type { ProjectInvocation } from '../resolve.js'

import { toNativeCwd }            from './path/index.js'

interface ChildProcessOptions {
  invocation: ProjectInvocation
  env: NodeJS.ProcessEnv
  stdio: SpawnOptions['stdio']
}

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
