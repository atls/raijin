import type { InvocationExecutionContext } from '../../execution/context.interfaces.js'
import type { ProcessOutputPolicy }        from '../../execution/process.interfaces.js'

export interface ExecaExecutionOptions {
  context: InvocationExecutionContext
  cwd: string
  env: NodeJS.ProcessEnv
  input?: 'ignore'
  output?: ProcessOutputPolicy
  cancelSignal?: AbortSignal
  timeoutMs?: number
}
