import type { ExecuteInput }  from '../../../application/execution/index.js'
import type { ExecuteResult } from '../../../application/execution/index.js'

export interface ApplicationInvocation {
  execute: (input: ExecuteInput) => Promise<ExecuteResult>
}

export type ApplicationExecutionInput = ExecuteInput
export type ApplicationExecutionResult = ExecuteResult
