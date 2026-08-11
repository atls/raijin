import type { Input as ExecuteInput }         from '../../../../application/execution/index.js'
import type { Port as Executor }              from '../../../../application/execution/index.js'
import type { Result as ExecuteResult }       from '../../../../application/execution/index.js'
import type { ExecuteResult as ProcessExecuteResult } from '../../../process/execa/execute.interfaces.js'
import type { ExecutorOptions }               from './executor.interfaces.js'

import { execute as executeProcess }          from '../../../process/execa/execute.js'
import { isManagedNodeEnvironmentName }       from '../loaders/environment.js'
import { removeEnvironmentMarkers }           from '../loaders/environment.js'
import { create as createRegistrationImport } from '../loaders/registration.js'
import { resolve as resolveLoader }           from '../loaders/typescript/resolve.js'
import { directory }                          from './directory.js'

type ProcessResult = Exclude<ExecuteResult, { reason: 'cleanup-failed' }>

const toProcessResult = (result: ProcessExecuteResult): ProcessResult => {
  const output = { stderr: result.stderr, stdout: result.stdout }

  switch (result.reason) {
    case 'cancelled':
      return { ...output, reason: 'cancelled' }
    case 'completed':
      return { ...output, reason: 'completed', exitCode: result.exitCode }
    case 'output-failed':
      return {
        ...output,
        reason: 'output-failed',
        exitCode: result.exitCode,
      }
    case 'signalled':
      return { ...output, reason: 'signalled', signal: result.signal }
    case 'start-failed':
      return { ...output, reason: 'start-failed' }
    case 'timed-out':
      return { ...output, reason: 'timed-out' }
    default: {
      const exhaustive: never = result

      return exhaustive
    }
  }
}

const createArguments = (input: ExecuteInput, loader: string): Array<string> => [
  '--enable-source-maps',
  '--import',
  createRegistrationImport([loader]),
  '--',
  input.entry,
  ...(input.arguments ?? []),
]

const assertEnvironmentPatch = (environment: ExecuteInput['environment']): void => {
  for (const name of Object.keys(environment ?? {})) {
    if (isManagedNodeEnvironmentName(name)) {
      throw new Error(`Managed Node execution cannot override ${name}`)
    }
  }
}

const execute = async (input: ExecuteInput, options: ExecutorOptions): Promise<ExecuteResult> => {
  let temporaryDirectory: Awaited<ReturnType<typeof directory.create>> | undefined
  let execution: ProcessResult

  try {
    temporaryDirectory = await directory.create()

    assertEnvironmentPatch(input.environment)

    const environment = await options.environment.prepare({
      binDirectory: temporaryDirectory.path,
      cwd: input.cwd,
      patch: input.environment ?? {},
    })

    removeEnvironmentMarkers(environment)

    const output = input.output?.mode === 'inherit' ? undefined : input.output
    const result = await executeProcess(
      process.execPath,
      createArguments(input, await resolveLoader()),
      {
        cancelSignal: input.cancelSignal,
        streams: {
          stderr: 'inherit',
          stdin: 'inherit',
          stdout: 'inherit',
        },
        cwd: input.cwd,
        env: environment,
        input: input.input === 'ignore' ? 'ignore' : undefined,
        output,
        timeoutMs: input.timeoutMs,
      }
    )

    execution = toProcessResult(result)
  } catch {
    execution = { reason: 'start-failed', stderr: '', stdout: '' }
  }

  if (temporaryDirectory) {
    try {
      await temporaryDirectory.remove()
    } catch {
      return { reason: 'cleanup-failed', execution }
    }
  }

  return execution
}

export const create = (options: ExecutorOptions): Executor => ({
  execute: async (input) => execute(input, options),
})
