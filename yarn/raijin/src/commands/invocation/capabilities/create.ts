import type { ProjectInvocation }             from '../scope/invocation.interfaces.js'
import type { InvocationCapabilitiesOptions } from './create.interfaces.js'
import type { ProcessInvocationOptions }      from './create.interfaces.js'
import type { ProcessInvocation }             from './process.interfaces.js'
import type { ProjectProcessInvocation }      from './process.interfaces.js'

import { toNativeCwd }                        from '../adapters/path/index.js'
import { executeYarnCommand }                 from '../adapters/yarn/execution.js'

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
