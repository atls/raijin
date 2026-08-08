import type { ManagedNodeExecutionInput }  from '../inputs/execute.interfaces.js'
import type { ManagedNodeExecutionResult } from '../results/execute.interfaces.js'

export interface ManagedNodeExecutor {
  execute: (input: ManagedNodeExecutionInput) => Promise<ManagedNodeExecutionResult>
}
