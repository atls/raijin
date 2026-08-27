import type { Options }            from 'execa'
import type { Result }             from 'execa'
import type { StdoutStderrOption } from 'execa'
import type { Message }            from 'execa'

import type { ExecuteOptions }     from './execute.interfaces.js'
import type { OutputEvent }        from './execute.interfaces.js'
import type { ExecuteResult }      from './execute.interfaces.js'

import { execa }                   from 'execa'

const createOutputHandler = (
  handler: (event: OutputEvent) => void,
  source: OutputEvent['source']
): StdoutStderrOption => ({
  preserveNewlines: true,
  *transform(data: string) {
    handler({ data, source })
    yield* []
  },
})

const resolveOutput = (
  stream: ExecuteOptions['streams']['stdout'],
  output: ExecuteOptions['output'],
  source: OutputEvent['source']
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
  channel,
  cwd,
  env,
  forceKillAfterDelay,
  input,
  output,
  streams,
  timeoutMs,
}: ExecuteOptions): Options => ({
  buffer: channel !== undefined || output?.mode === 'capture',
  cancelSignal,
  cleanup: true,
  cwd,
  encoding: 'utf8',
  env,
  extendEnv: false,
  forceKillAfterDelay,
  ipc: channel !== undefined,
  ipcInput: channel?.input as Message | undefined,
  reject: false,
  serialization: 'advanced',
  stderr: resolveOutput(streams.stderr, output, 'stderr'),
  stdin: input === 'ignore' ? 'ignore' : streams.stdin,
  stdout: resolveOutput(streams.stdout, output, 'stdout'),
  stripFinalNewline: false,
  timeout: timeoutMs,
})

const resolveExecutionOutput = (
  result: Result,
  channelEnabled: boolean
): Pick<ExecuteResult, 'messages' | 'stderr' | 'stdout'> => ({
  ...(channelEnabled ? { messages: result.ipcOutput as ReadonlyArray<unknown> } : {}),
  stderr: typeof result.stderr === 'string' ? result.stderr : '',
  stdout: typeof result.stdout === 'string' ? result.stdout : '',
})

export const execute = async (
  command: string,
  args: ReadonlyArray<string>,
  options: ExecuteOptions
): Promise<ExecuteResult> => {
  let result: Result

  try {
    result = await execa(command, args, createExecaOptions(options))
  } catch (cause) {
    return {
      reason: 'start-failed',
      cause,
      ...(options.channel ? { messages: [] } : {}),
      stderr: '',
      stdout: '',
    }
  }

  const output = resolveExecutionOutput(result, options.channel !== undefined)

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
    if (result.cause !== undefined) {
      return {
        ...output,
        reason: 'output-failed',
        cause: result.cause,
        exitCode: result.exitCode,
      }
    }

    return { ...output, reason: 'completed', exitCode: result.exitCode }
  }

  return { ...output, reason: 'start-failed', cause: result }
}
