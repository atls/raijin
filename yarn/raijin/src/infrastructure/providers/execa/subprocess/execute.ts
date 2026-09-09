import type { Options }            from 'execa'
import type { Result }             from 'execa'
import type { StdinOption }        from 'execa'
import type { StdoutStderrOption } from 'execa'

import type { ExecuteOptions }     from './execute.interfaces.js'
import type { OutputEvent }        from './execute.interfaces.js'
import type { ExecuteResult }      from './execute.interfaces.js'

import { pipeline }                from 'node:stream/promises'

import { execa }                   from 'execa'

type InputStream = Exclude<ExecuteOptions['streams']['stdin'], 'inherit'>
type OutputStream = Exclude<ExecuteOptions['streams']['stdout'], 'inherit'>

interface ResolvedInput {
  input?: InputStream
  stdin: StdinOption
}

const hasInputDescriptor = (stream: InputStream): stream is InputStream & { fd: 0 } =>
  'fd' in stream && stream.fd === 0

const hasOutputDescriptor = (stream: OutputStream): stream is OutputStream & { fd: 1 | 2 } =>
  'fd' in stream && (stream.fd === 1 || stream.fd === 2)

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
    return stream === 'inherit' || hasOutputDescriptor(stream) ? stream : 'pipe'
  }

  if (output.mode === 'capture') {
    return output.forward ? ['pipe', stream] : 'pipe'
  }

  return createOutputHandler(output.handler, source)
}

const resolveInput = (stream: ExecuteOptions['streams']['stdin']): ResolvedInput =>
  stream === 'inherit' || hasInputDescriptor(stream)
    ? { stdin: stream }
    : { input: stream, stdin: 'pipe' }

const createExecaOptions = ({
  cancelSignal,
  cwd,
  env,
  input,
  output,
  streams,
  timeoutMs,
}: ExecuteOptions): Options => {
  const inputOptions =
    input === 'ignore' ? { stdin: 'ignore' as const } : resolveInput(streams.stdin)

  return {
    buffer: output?.mode === 'capture',
    cancelSignal,
    cleanup: !cancelSignal,
    cwd,
    encoding: 'utf8',
    env,
    extendEnv: false,
    reject: false,
    stderr: resolveOutput(streams.stderr, output, 'stderr'),
    stdout: resolveOutput(streams.stdout, output, 'stdout'),
    stripFinalNewline: false,
    timeout: timeoutMs,
    ...inputOptions,
  }
}

const resolveExecutionOutput = (result: Result): Pick<ExecuteResult, 'stderr' | 'stdout'> => ({
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
    const subprocess = execa(command, args, createExecaOptions(options))
    const forwarding: Array<Promise<void>> = []

    if (!options.output) {
      if (
        options.streams.stdout !== 'inherit' &&
        !hasOutputDescriptor(options.streams.stdout) &&
        subprocess.stdout
      ) {
        forwarding.push(pipeline(subprocess.stdout, options.streams.stdout, { end: false }))
      }

      if (
        options.streams.stderr !== 'inherit' &&
        !hasOutputDescriptor(options.streams.stderr) &&
        subprocess.stderr
      ) {
        forwarding.push(pipeline(subprocess.stderr, options.streams.stderr, { end: false }))
      }
    }

    result = await subprocess
    await Promise.all(forwarding)
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
