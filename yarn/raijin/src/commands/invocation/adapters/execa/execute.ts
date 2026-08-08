import type { ProcessExecutionResult } from '../../capabilities/process.interfaces.js'
import type { ExecaExecutionOptions }  from './execute.interfaces.js'

import { executeProcessWithExeca }     from '../../../../infrastructure/process/execa/execute.js'

export const executeProcess = async (
  command: string,
  args: Array<string>,
  options: ExecaExecutionOptions
): Promise<ProcessExecutionResult> => {
  const result = await executeProcessWithExeca(command, args, options)

  return result
}
