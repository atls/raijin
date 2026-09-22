import type { ProjectInvocation }              from '../scope/interfaces/invocation.js'
import type { ApplicationInvocation }          from './interfaces/application.js'
import type { ApplicationInvocationOptions }   from './interfaces/create.js'
import type { InvocationCapabilitiesOptions }  from './interfaces/create.js'
import type { ProcessInvocationOptions }       from './interfaces/create.js'
import type { ProcessInvocation }              from './interfaces/process.js'
import type { ProjectProcessInvocation }       from './interfaces/process.js'

import { create as createApplicationExecutor } from '../../../execution/node/executor.js'
import { create as createYarnEnvironment }     from '../../../execution/yarn/create.js'
import { resolveRaijinRuntimeUrl }             from '../../../runtime/runtime-resolver.js'
import { toNativeCwd }                         from '../path/index.js'
import { executeYarnCommand }                  from '../yarn/execution.js'

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
