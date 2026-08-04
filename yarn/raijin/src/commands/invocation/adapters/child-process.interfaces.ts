import type { Readable }            from 'node:stream'
import type { Writable }            from 'node:stream'

import type { CommandOutputPolicy } from '../resolve.interfaces.js'

export interface InvocationExecutionContext {
  environment: NodeJS.ProcessEnv
  stderr: Writable
  stdin: Readable
  stdout: Writable
}

export interface ChildProcessOptions {
  context: InvocationExecutionContext
  cwd: string
  env: NodeJS.ProcessEnv
  input?: 'ignore'
  output?: CommandOutputPolicy
  timeout?: number
}
