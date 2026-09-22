import type { ExecuteInput }  from '../../../../execution/index.js'
import type { ExecuteResult } from '../../../../execution/index.js'

export interface ApplicationInvocation {
  execute: (input: ExecuteInput) => Promise<ExecuteResult>
}

export type ApplicationExecutionInput = ExecuteInput
export type ApplicationExecutionResult = ExecuteResult
