import type { SpawnOptions }      from 'node:child_process'

import type { ProjectInvocation } from '../resolve.interfaces.js'

export interface ChildProcessOptions {
  invocation: ProjectInvocation
  env: NodeJS.ProcessEnv
  stdio: SpawnOptions['stdio']
}
