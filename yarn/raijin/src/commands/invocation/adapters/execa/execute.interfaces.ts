import type { ProcessOutputPolicy }      from '../../capabilities/process.interfaces.js'
import type { InvocationAdapterContext } from '../context.interfaces.js'

export interface ExecaExecutionOptions {
  context: InvocationAdapterContext
  cwd: string
  env: NodeJS.ProcessEnv
  input?: 'ignore'
  output?: ProcessOutputPolicy
  cancelSignal?: AbortSignal
  timeoutMs?: number
}
