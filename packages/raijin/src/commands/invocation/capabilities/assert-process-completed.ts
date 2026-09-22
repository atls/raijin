import type { CompletedProcessExecution } from './interfaces/process.js'
import type { ProcessExecutionResult }    from './interfaces/process.js'

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
