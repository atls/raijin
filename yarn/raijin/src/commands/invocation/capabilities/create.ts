import type { ProjectInvocation }             from '../scope/invocation.interfaces.js'
import type { ApplicationInvocation }         from './application.interfaces.js'
import type { ApplicationInvocationOptions }  from './create.interfaces.js'
import type { InvocationCapabilitiesOptions } from './create.interfaces.js'
import type { ProcessInvocationOptions }      from './create.interfaces.js'
import type { ProcessInvocation }             from './process.interfaces.js'
import type { ProjectProcessInvocation }      from './process.interfaces.js'

import { create as createApplicationExecutor } from '../../../infrastructure/adapters/node/execution/executor.js'
import { create as createYarnEnvironment } from '../../../infrastructure/providers/yarn/environment/create.js'
import { resolveRaijinRuntimeUrl }            from '../../../runtime/runtime-resolver.js'
import { toNativeCwd }                        from '../adapters/path/index.js'
import { executeYarnCommand }                 from '../adapters/yarn/execution.js'

const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

export const createApplicationInvocation = ({
  environment,
  locator,
  project,
  streams,
}: ApplicationInvocationOptions): ApplicationInvocation =>
  createApplicationExecutor({
    environment: {
      prepare: async (input) =>
        createYarnEnvironment({
          ...input,
          baseEnvironment: environment,
          locator,
          project,
        }),
    },
    loader: {
      resolve: async (cwd) => resolveRaijinRuntimeUrl(cwd, TYPESCRIPT_LOADER_SPECIFIER),
    },
    streams,
  })

export const createProcessInvocation = ({
  environment,
  executionCwd,
  executor,
}: ProcessInvocationOptions): ProcessInvocation => ({
  execute: async (command, args, options = {}) =>
    executor.execute(command, args, {
      cwd: toNativeCwd(executionCwd),
      environment: { ...environment },
      input: options.input,
      output: options.output,
      timeoutMs: options.timeoutMs,
    }),
})

const createProjectProcessInvocation = ({
  environment,
  executionCwd,
  executor,
  projectCwd,
}: ProcessInvocationOptions & {
  projectCwd: InvocationCapabilitiesOptions['project']['cwd']
}): ProjectProcessInvocation => ({
  ...createProcessInvocation({ environment, executionCwd, executor }),
  project: createProcessInvocation({ environment, executionCwd: projectCwd, executor }),
})

export const createInvocationCapabilities = ({
  configuration,
  environment,
  executionCwd,
  executor,
  project,
}: InvocationCapabilitiesOptions): Pick<ProjectInvocation, 'process' | 'yarn'> => ({
  process: createProjectProcessInvocation({
    environment,
    executionCwd,
    executor,
    projectCwd: project.cwd,
  }),
  yarn: {
    configuration,
    project,
    run: async (args, options) =>
      executeYarnCommand({
        args,
        environment,
        executionCwd,
        executor,
        options,
        project,
      }),
    capture: async (args, options = {}) => {
      const { forwardOutput, ...runOptions } = options

      return executeYarnCommand({
        args,
        environment,
        executionCwd,
        executor,
        options: {
          ...runOptions,
          output: { mode: 'capture', forward: forwardOutput },
        },
        project,
      })
    },
    execute: async (args, options) => {
      const result = await executeYarnCommand({
        args,
        environment,
        executionCwd,
        executor,
        options,
        project,
      })

      return result.reason === 'completed' ? result.exitCode : 1
    },
  },
})
