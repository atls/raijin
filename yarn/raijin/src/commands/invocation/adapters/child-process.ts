import type { Options }                from 'execa'
import type { Result }                 from 'execa'
import type { StdinOption }            from 'execa'
import type { StdoutStderrOption }     from 'execa'
import type { Writable }               from 'node:stream'

import type { CommandExecutionResult } from '../resolve.interfaces.js'
import type { CommandOutputEvent }     from '../resolve.interfaces.js'
import type { ChildProcessOptions }    from './child-process.interfaces.js'

import { constants }                   from 'node:os'
import { Readable }                    from 'node:stream'

import { execa }                       from 'execa'

const resolveSignalExitCode = (signal: NodeJS.Signals): number => 128 + constants.signals[signal]

const hasFileDescriptor = (stream: Readable | Writable): boolean =>
  typeof (stream as { fd?: unknown }).fd === 'number'

const resolveInput = (
  stream: Readable,
  input: ChildProcessOptions['input']
): { stdin: StdinOption } => {
  if (input === 'ignore') {
    return { stdin: 'ignore' }
  }

  if (hasFileDescriptor(stream)) {
    return { stdin: stream }
  }

  // Node 22 exposes this bridge before the API's documented stabilization in 22.17.
  return { stdin: Readable.toWeb(stream) } // eslint-disable-line n/no-unsupported-features/node-builtins
}

const createOutputHandler = (
  handler: (event: CommandOutputEvent) => void,
  source: CommandOutputEvent['source']
): StdoutStderrOption => ({
  preserveNewlines: true,
  *transform(data: string) {
    handler({ data, source })
    yield* []
  },
})

const resolveOutput = (
  stream: Writable,
  output: ChildProcessOptions['output'],
  source: CommandOutputEvent['source']
): StdoutStderrOption => {
  if (!output) {
    return hasFileDescriptor(stream) ? stream : ['pipe', stream]
  }

  if (output.mode === 'capture') {
    return output.forward ? ['pipe', stream] : 'pipe'
  }

  return createOutputHandler(output.handler, source)
}

export const createChildProcessOptions = ({
  context,
  cwd,
  env,
  input,
  output,
  timeout,
}: ChildProcessOptions): Options => ({
  buffer: output?.mode === 'capture',
  cleanup: true,
  cwd,
  encoding: 'utf8',
  env,
  extendEnv: false,
  forceKillAfterDelay: 5000,
  reject: false,
  stderr: resolveOutput(context.stderr, output, 'stderr'),
  ...resolveInput(context.stdin, input),
  stdout: resolveOutput(context.stdout, output, 'stdout'),
  stripFinalNewline: false,
  timeout,
})

const resolveExecutionOutput = (
  result: Result
): Pick<CommandExecutionResult, 'stderr' | 'stdout'> => ({
  stderr: typeof result.stderr === 'string' ? result.stderr : '',
  stdout: typeof result.stdout === 'string' ? result.stdout : '',
})

export const executeChildProcess = async (
  command: string,
  args: Array<string>,
  options: ChildProcessOptions
): Promise<CommandExecutionResult> => {
  const result = await execa(command, args, createChildProcessOptions(options))
  const output = resolveExecutionOutput(result)

  if (result.timedOut) {
    return { ...output, exitCode: 124, termination: 'timeout', timedOut: true }
  }

  if (result.signal) {
    return {
      ...output,
      exitCode: resolveSignalExitCode(result.signal),
      signal: result.signal,
      termination: 'signal',
      timedOut: false,
    }
  }

  if (result.exitCode === undefined) {
    throw result
  }

  return {
    ...output,
    exitCode: result.exitCode,
    termination: 'exit',
    timedOut: false,
  }
}
