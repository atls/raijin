import type { ManagedNodeExecutionInput }      from '../../../application/execution/node/index.js'
import type { ManagedNodeExecutionResult }     from '../../../application/execution/node/index.js'
import type { ManagedNodeExecutor }            from '../../../application/execution/node/index.js'
import type { ManagedNodeProcessResult }       from '../../../application/execution/node/index.js'
import type { ExecaProcessExecutionResult }    from '../../process/execa/execute.interfaces.js'
import type { YarnManagedNodeExecutorOptions } from './executor.interfaces.js'

import { npath }                               from '@yarnpkg/fslib'

import { executeProcessWithExeca }             from '../../process/execa/execute.js'
import { createYarnNodeEnvironment }           from './environment.js'
import { createNodeLoaderRegistrationImport }  from './loader-registration.js'
import { nodeTemporaryDirectories }            from './temporary-directory.js'
import { resolveTypeScriptLoader }             from './typescript-loader.js'

const toManagedNodeProcessResult = (
  result: ExecaProcessExecutionResult
): ManagedNodeProcessResult => result

const createNodeArguments = (
  input: ManagedNodeExecutionInput,
  loaders: ReadonlyArray<string>
): Array<string> => [
  '--enable-source-maps',
  ...(loaders.length > 0 ? ['--import', createNodeLoaderRegistrationImport(loaders)] : []),
  input.program,
  ...(input.arguments ?? []),
]

const execute = async (
  input: ManagedNodeExecutionInput,
  options: YarnManagedNodeExecutorOptions
): Promise<ManagedNodeExecutionResult> => {
  const temporaryDirectories = options.temporaryDirectories ?? nodeTemporaryDirectories
  let directory: Awaited<ReturnType<typeof temporaryDirectories.create>> | undefined
  let execution: ManagedNodeProcessResult

  try {
    directory = await temporaryDirectories.create()

    const loaders = options.loaders ?? [await resolveTypeScriptLoader()]
    const environment = await createYarnNodeEnvironment({
      baseEnvironment: options.baseEnvironment ?? process.env,
      binFolder: npath.toPortablePath(directory.path),
      cwd: input.cwd,
      environmentPatch: input.environment ?? {},
      locator: options.locator,
      project: options.project,
    })
    const output = input.output?.mode === 'inherit' ? undefined : input.output
    const result = await executeProcessWithExeca(
      process.execPath,
      createNodeArguments(input, loaders),
      {
        cancelSignal: input.cancelSignal,
        context: {
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

    execution = toManagedNodeProcessResult(result)
  } catch (cause) {
    execution = { reason: 'start-failed', cause, stderr: '', stdout: '' }
  }

  if (directory) {
    try {
      await directory.remove()
    } catch (cause) {
      return { reason: 'cleanup-failed', cause, execution }
    }
  }

  return execution
}

export const createYarnManagedNodeExecutor = (
  options: YarnManagedNodeExecutorOptions
): ManagedNodeExecutor => ({
  execute: async (input) => execute(input, options),
})
