import type { ManagedNodeExecutionInput }  from '../inputs/execute.interfaces.js'
import type { ManagedNodeExecutor }        from '../ports/executor.interfaces.js'
import type { ManagedNodeExecutionResult } from '../results/execute.interfaces.js'

export const executeManagedNode = async (
  input: ManagedNodeExecutionInput,
  { executor }: { executor: ManagedNodeExecutor }
): Promise<ManagedNodeExecutionResult> => executor.execute(input)
