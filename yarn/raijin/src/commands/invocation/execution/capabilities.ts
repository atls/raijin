import type { ProjectInvocation }             from '../scope/invocation.interfaces.js'
import type { InvocationCapabilitiesOptions } from './capabilities.interfaces.js'
import type { ProcessInvocationOptions }      from './capabilities.interfaces.js'
import type { ProcessInvocation }             from './process.interfaces.js'
import type { ProjectProcessInvocation }      from './process.interfaces.js'

import { executeProcess }                     from '../adapters/execa/execute.js'
import { toNativeCwd }                        from '../adapters/path/index.js'
import { executeYarnCommand }                 from '../adapters/yarn/execution.js'

export const createProcessInvocation = ({
  context,
  executionCwd,
}: ProcessInvocationOptions): ProcessInvocation => ({
  execute: async (command, args, options = {}) =>
    executeProcess(command, args, {
      context,
      cwd: toNativeCwd(executionCwd),
      env: { ...context.environment },
      input: options.input,
      output: options.output,
      timeoutMs: options.timeoutMs,
    }),
})

const createProjectProcessInvocation = ({
  context,
  executionCwd,
  projectCwd,
}: ProcessInvocationOptions & {
  projectCwd: InvocationCapabilitiesOptions['project']['cwd']
}): ProjectProcessInvocation => ({
  ...createProcessInvocation({ context, executionCwd }),
  project: createProcessInvocation({ context, executionCwd: projectCwd }),
})

export const createInvocationCapabilities = ({
  configuration,
  context,
  executionCwd,
  project,
}: InvocationCapabilitiesOptions): Pick<ProjectInvocation, 'process' | 'yarn'> => ({
  process: createProjectProcessInvocation({
    context,
    executionCwd,
    projectCwd: project.cwd,
  }),
  yarn: {
    configuration,
    project,
    run: async (args, options) =>
      executeYarnCommand({
        args,
        context,
        executionCwd,
        options,
        project,
      }),
    capture: async (args, options = {}) => {
      const { forwardOutput, ...runOptions } = options

      return executeYarnCommand({
        args,
        context,
        executionCwd,
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
        context,
        executionCwd,
        options,
        project,
      })

      return result.reason === 'completed' ? result.exitCode : 1
    },
  },
})
