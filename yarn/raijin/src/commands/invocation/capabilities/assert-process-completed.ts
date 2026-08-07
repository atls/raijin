import type { CompletedProcessExecution } from './process.interfaces.js'
import type { ProcessExecutionResult }    from './process.interfaces.js'

export function assertProcessCompleted(
  result: ProcessExecutionResult
): asserts result is CompletedProcessExecution {
  if (result.reason === 'completed') {
    return
  }

  if (result.cause instanceof Error) {
    throw result.cause
  }

  throw new Error(`Process execution ${result.reason}`, { cause: result.cause })
}
