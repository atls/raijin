import type { ChildProcess }             from 'node:child_process'
import type { SpawnOptions }             from 'node:child_process'

import type { CommandExecutionResult }   from '../resolve.interfaces.js'
import type { ChildProcessOptions }      from './child-process.interfaces.js'
import type { ChildProcessSignalTarget } from './child-process.interfaces.js'

import { spawn }                         from 'node:child_process'
import { constants }                     from 'node:os'

const FORWARDED_SIGNALS: ReadonlyArray<NodeJS.Signals> =
  process.platform === 'win32' ? ['SIGBREAK', 'SIGINT', 'SIGTERM'] : ['SIGHUP', 'SIGINT', 'SIGTERM']

const resolveSignalExitCode = (signal: NodeJS.Signals): number => 128 + constants.signals[signal]

export const createChildProcessOptions = ({
  cwd,
  env,
  input = 'inherit',
}: ChildProcessOptions): SpawnOptions => ({
  cwd,
  env,
  stdio: [input === 'ignore' ? 'ignore' : 'pipe', 'pipe', 'pipe'],
})

export const forwardChildProcessSignals = (
  child: ChildProcess,
  signalTarget: ChildProcessSignalTarget = process
): (() => void) => {
  const listeners = new Map<NodeJS.Signals, () => void>()
  const cleanup = (): void => {
    for (const [signal, listener] of listeners) {
      signalTarget.off(signal, listener)
    }

    listeners.clear()
  }

  for (const signal of FORWARDED_SIGNALS) {
    const listener = (): void => {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill(signal)
      }
    }

    listeners.set(signal, listener)
    signalTarget.on(signal, listener)
  }

  child.once('close', cleanup)
  child.once('error', cleanup)

  return cleanup
}

export const executeChildProcess = async (
  command: string,
  args: Array<string>,
  options: ChildProcessOptions
): Promise<CommandExecutionResult> => {
  const output = options.output ?? { mode: 'inherit' }
  const stdoutChunks: Array<Buffer> = []
  const stderrChunks: Array<Buffer> = []
  const child = spawn(command, args, createChildProcessOptions(options))
  let timedOut = false
  let timeout: NodeJS.Timeout | undefined
  let killTimeout: NodeJS.Timeout | undefined

  forwardChildProcessSignals(child)

  if (options.input !== 'ignore' && child.stdin) {
    options.context.stdin.pipe(child.stdin)
  }

  child.stdout?.on('data', (data: Buffer) => {
    if (output.mode === 'inherit') {
      options.context.stdout.write(data)
    } else if (output.mode === 'capture') {
      stdoutChunks.push(data)

      if (output.forward) {
        options.context.stdout.write(data)
      }
    } else {
      output.handler({ data: data.toString(), source: 'stdout' })
    }
  })
  child.stderr?.on('data', (data: Buffer) => {
    if (output.mode === 'inherit') {
      options.context.stderr.write(data)
    } else if (output.mode === 'capture') {
      stderrChunks.push(data)

      if (output.forward) {
        options.context.stderr.write(data)
      }
    } else {
      output.handler({ data: data.toString(), source: 'stderr' })
    }
  })

  if (options.timeout !== undefined) {
    timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      killTimeout = setTimeout(() => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL')
        }
      }, 5000)
      killTimeout.unref()
    }, options.timeout)
  }

  return new Promise<CommandExecutionResult>((resolve, reject) => {
    const cleanup = (): void => {
      if (timeout) clearTimeout(timeout)
      if (killTimeout) clearTimeout(killTimeout)
      if (child.stdin) options.context.stdin.unpipe(child.stdin)
    }

    child.once('error', (error) => {
      cleanup()
      reject(error)
    })
    child.once('close', (code, terminationSignal) => {
      cleanup()
      const executionOutput = {
        stderr: Buffer.concat(stderrChunks).toString(),
        stdout: Buffer.concat(stdoutChunks).toString(),
      }

      if (timedOut) {
        resolve({ ...executionOutput, exitCode: 124, termination: 'timeout', timedOut: true })

        return
      }

      if (terminationSignal) {
        resolve({
          ...executionOutput,
          exitCode: resolveSignalExitCode(terminationSignal),
          signal: terminationSignal,
          termination: 'signal',
          timedOut: false,
        })

        return
      }

      resolve({
        ...executionOutput,
        exitCode: code ?? 1,
        termination: 'exit',
        timedOut: false,
      })
    })
  })
}
