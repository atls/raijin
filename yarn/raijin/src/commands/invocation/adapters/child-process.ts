import type { ChildProcess }             from 'node:child_process'
import type { SpawnOptions }             from 'node:child_process'

import type { ProjectInvocation }        from '../resolve.interfaces.js'
import type { ChildProcessOptions }      from './child-process.interfaces.js'
import type { ChildProcessRunOptions }   from './child-process.interfaces.js'
import type { ChildProcessSignalTarget } from './child-process.interfaces.js'

import { spawn }                         from 'node:child_process'

import { toNativeCwd }                   from './path/index.js'

const FORWARDED_SIGNALS: ReadonlyArray<NodeJS.Signals> =
  process.platform === 'win32' ? ['SIGBREAK', 'SIGINT', 'SIGTERM'] : ['SIGHUP', 'SIGINT', 'SIGTERM']

export const createChildProcessOptions = ({
  env,
  invocation,
  stdio,
}: ChildProcessOptions): SpawnOptions => ({
  cwd: toNativeCwd(invocation.executionCwd),
  env,
  stdio,
})

export const waitForChildProcess = async (child: ChildProcess): Promise<number> =>
  new Promise<number>((resolve, reject) => {
    child.once('error', reject)
    child.once('close', (code) => {
      resolve(code ?? 1)
    })
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

export const spawnChildProcess = (
  invocation: ProjectInvocation,
  command: string,
  args: Array<string>,
  options: ChildProcessRunOptions
): ChildProcess => {
  const child = spawn(
    command,
    args,
    createChildProcessOptions({
      invocation,
      env: options.env,
      stdio: options.stdio,
    })
  )

  forwardChildProcessSignals(child)

  return child
}
