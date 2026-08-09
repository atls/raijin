import type { Input as ExecuteInput } from '../../../../application/execution/node/index.js'
import type { Port as Executor } from '../../../../application/execution/node/index.js'
import type { Process as ProcessResult } from '../../../../application/execution/node/index.js'
import type { Result as ExecuteResult } from '../../../../application/execution/node/index.js'
import type { ExecuteResult as ProcessExecuteResult } from '../../../process/execa/result.js'
import type { Options }                               from './options.js'

import { npath }                                      from '@yarnpkg/fslib'

import { create as createCleanupFailure } from '../../../../application/execution/node/failures/cleanup.js'
import { create as createOutputFailure } from '../../../../application/execution/node/failures/output.js'
import { create as createStartFailure } from '../../../../application/execution/node/failures/start.js'
import { execute as executeProcess }                  from '../../../process/execa/execute.js'
import { create as createRegistrationImport }         from '../loaders/registration.js'
import { resolve as resolveLoader }                   from '../loaders/typescript/resolve.js'
import { directory }                                  from './directory.js'
import { create as createEnvironment }                from './environment/create.js'

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
        failure: createOutputFailure(),
      }
    case 'signalled':
      return { ...output, reason: 'signalled', signal: result.signal }
    case 'start-failed':
      return { ...output, reason: 'start-failed', failure: createStartFailure() }
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
  input.program,
  ...(input.arguments ?? []),
]

const execute = async (input: ExecuteInput, options: Options): Promise<ExecuteResult> => {
  let temporaryDirectory: Awaited<ReturnType<typeof directory.create>> | undefined
  let execution: ProcessResult

  try {
    temporaryDirectory = await directory.create()

    const environment = await createEnvironment({
      baseEnvironment: options.baseEnvironment ?? process.env,
      binFolder: npath.toPortablePath(temporaryDirectory.path),
      cwd: input.cwd,
      environmentPatch: input.environment ?? {},
      locator: options.locator,
      project: options.project,
    })
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
    execution = { reason: 'start-failed', failure: createStartFailure(), stderr: '', stdout: '' }
  }

  if (temporaryDirectory) {
    try {
      await temporaryDirectory.remove()
    } catch {
      return { reason: 'cleanup-failed', failure: createCleanupFailure(), execution }
    }
  }

  return execution
}

export const create = (options: Options): Executor => ({
  execute: async (input) => execute(input, options),
})
