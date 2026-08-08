import type { Options }                      from 'execa'
import type { Result }                       from 'execa'
import type { StdoutStderrOption }           from 'execa'

import type { ExecaProcessExecutionOptions } from './execute.interfaces.js'
import type { ExecaProcessExecutionResult }  from './execute.interfaces.js'
import type { ExecaProcessOutputEvent }      from './execute.interfaces.js'

import { execa }                             from 'execa'

const createOutputHandler = (
  handler: (event: ExecaProcessOutputEvent) => void,
  source: ExecaProcessOutputEvent['source']
): StdoutStderrOption => ({
  preserveNewlines: true,
  *transform(data: string) {
    handler({ data, source })
    yield* []
  },
})

const resolveOutput = (
  stream: ExecaProcessExecutionOptions['context']['stdout'],
  output: ExecaProcessExecutionOptions['output'],
  source: ExecaProcessOutputEvent['source']
): StdoutStderrOption => {
  if (!output) {
    return stream
  }

  if (output.mode === 'capture') {
    return output.forward ? ['pipe', stream] : 'pipe'
  }

  return createOutputHandler(output.handler, source)
}

const createExecaOptions = ({
  cancelSignal,
  context,
  cwd,
  env,
  input,
  output,
  timeoutMs,
}: ExecaProcessExecutionOptions): Options => ({
  buffer: output?.mode === 'capture',
  cancelSignal,
  cleanup: true,
  cwd,
  encoding: 'utf8',
  env,
  extendEnv: false,
  reject: false,
  stderr: resolveOutput(context.stderr, output, 'stderr'),
  stdin: input === 'ignore' ? 'ignore' : context.stdin,
  stdout: resolveOutput(context.stdout, output, 'stdout'),
  stripFinalNewline: false,
  timeout: timeoutMs,
})

const resolveExecutionOutput = (
  result: Result
): Pick<ExecaProcessExecutionResult, 'stderr' | 'stdout'> => ({
  stderr: typeof result.stderr === 'string' ? result.stderr : '',
  stdout: typeof result.stdout === 'string' ? result.stdout : '',
})

export const executeProcessWithExeca = async (
  command: string,
  args: ReadonlyArray<string>,
  options: ExecaProcessExecutionOptions
): Promise<ExecaProcessExecutionResult> => {
  let result: Result

  try {
    result = await execa(command, args, createExecaOptions(options))
  } catch (cause) {
    return { reason: 'start-failed', cause, stderr: '', stdout: '' }
  }

  const output = resolveExecutionOutput(result)

  if (result.timedOut) {
    return { ...output, reason: 'timed-out', cause: result }
  }

  if (result.isCanceled) {
    return { ...output, reason: 'cancelled', cause: result }
  }

  if (result.signal || result.isTerminated) {
    return { ...output, reason: 'signalled', cause: result, signal: result.signal }
  }

  if (result.exitCode !== undefined) {
    return { ...output, reason: 'completed', exitCode: result.exitCode }
  }

  return { ...output, reason: 'start-failed', cause: result }
}
