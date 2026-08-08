import type { ProcessExecutor } from '../../../commands/invocation/capabilities/process.interfaces.js'
import type { ProcessExecutionResult } from '../../../commands/invocation/capabilities/process.interfaces.js'
import type { ExecaProcessContext }         from './execute.interfaces.js'
import type { ExecaProcessExecutionResult } from './execute.interfaces.js'

import { executeProcessWithExeca }          from './execute.js'

const toProcessExecutionResult = (result: ExecaProcessExecutionResult): ProcessExecutionResult => {
  const output = { stderr: result.stderr, stdout: result.stdout }

  switch (result.reason) {
    case 'cancelled':
      return { ...output, reason: 'cancelled', cause: result.cause }
    case 'completed':
      return { ...output, reason: 'completed', exitCode: result.exitCode }
    case 'signalled':
      return {
        ...output,
        reason: 'signalled',
        cause: result.cause,
        signal: result.signal,
      }
    case 'start-failed':
      return { ...output, reason: 'start-failed', cause: result.cause }
    case 'timed-out':
      return { ...output, reason: 'timed-out', cause: result.cause }
    default: {
      const unsupported: never = result

      throw new Error(`Unsupported Execa execution result: ${String(unsupported)}`)
    }
  }
}

export const createExecaProcessExecutor = (context: ExecaProcessContext): ProcessExecutor => ({
  execute: async (command, args, options) => {
    const result = await executeProcessWithExeca(command, args, {
      context,
      cwd: options.cwd,
      env: options.environment,
      input: options.input,
      output: options.output,
      timeoutMs: options.timeoutMs,
    })

    return toProcessExecutionResult(result)
  },
})
