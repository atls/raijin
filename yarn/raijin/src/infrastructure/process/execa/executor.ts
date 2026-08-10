import type { ProcessExecutionResult } from '../../../commands/invocation/capabilities/process.interfaces.js'
import type { Executor }      from '../../../commands/invocation/executor.js'
import type { ExecuteResult } from './execute.interfaces.js'
import type { Streams }       from './execute.interfaces.js'

import { execute }            from './execute.js'

const toProcessExecutionResult = (result: ExecuteResult): ProcessExecutionResult => {
  const output = { stderr: result.stderr, stdout: result.stdout }

  switch (result.reason) {
    case 'cancelled':
      return { ...output, reason: 'cancelled', cause: result.cause }
    case 'completed':
      return { ...output, reason: 'completed', exitCode: result.exitCode }
    case 'output-failed':
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
      const exhaustive: never = result

      return exhaustive
    }
  }
}

export const create = (streams: Streams): Executor => ({
  execute: async (command, args, options) => {
    const result = await execute(command, args, {
      cwd: options.cwd,
      env: options.environment,
      input: options.input,
      output: options.output,
      streams,
      timeoutMs: options.timeoutMs,
    })

    return toProcessExecutionResult(result)
  },
})
