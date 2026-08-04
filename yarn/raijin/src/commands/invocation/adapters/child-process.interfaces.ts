import type { SpawnOptions }      from 'node:child_process'

import type { ProjectInvocation } from '../resolve.interfaces.js'

export interface ChildProcessOptions {
  invocation: ProjectInvocation
  env: NodeJS.ProcessEnv
  stdio: SpawnOptions['stdio']
}

export interface ChildProcessRunOptions {
  env: NodeJS.ProcessEnv
  stdio: SpawnOptions['stdio']
}

export type ChildProcessSignalTarget = Pick<NodeJS.Process, 'off' | 'on'>
