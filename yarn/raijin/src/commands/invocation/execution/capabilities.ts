import type { ProjectInvocation }             from '../scope/invocation.interfaces.js'
import type { InvocationCapabilitiesOptions } from './capabilities.interfaces.js'
import type { ProcessInvocationOptions }      from './capabilities.interfaces.js'
import type { ProcessInvocation }             from './process.interfaces.js'

import { ProjectScopeUnavailableError }       from '../exceptions/project-scope-unavailable.js'
import { executeProcess }                     from '../adapters/execa/execute.js'
import { toNativeCwd }                        from '../adapters/path/index.js'
import { executeYarnCommand }                 from '../adapters/yarn/execution.js'

export const createProcessInvocation = ({
  context,
  executionCwd,
  projectCwd,
}: ProcessInvocationOptions): ProcessInvocation => ({
  execute: async (command, args, options = {}) => {
    if (options.scope === 'project' && !projectCwd) {
      throw new ProjectScopeUnavailableError()
    }

    const environment = { ...context.environment }
    const nodeOptions = await options.nodeOptions?.(environment.NODE_OPTIONS)

    if (options.nodeOptions) {
      if (nodeOptions) {
        environment.NODE_OPTIONS = nodeOptions
      } else {
        Reflect.deleteProperty(environment, 'NODE_OPTIONS')
      }
    }

    return executeProcess(command, args, {
      context,
      cwd: toNativeCwd(options.scope === 'project' && projectCwd ? projectCwd : executionCwd),
      env: environment,
      input: options.input,
      output: options.output,
      signal: options.signal,
      timeout: options.timeout,
    })
  },
})

export const createInvocationCapabilities = ({
  configuration,
  context,
  executionCwd,
  project,
}: InvocationCapabilitiesOptions): Pick<ProjectInvocation, 'process' | 'yarn'> => ({
  process: createProcessInvocation({
    context,
    executionCwd,
    projectCwd: project.cwd,
  }),
  yarn: {
    configuration,
    project,
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
    execute: async (args, options) =>
      (
        await executeYarnCommand({
          args,
          context,
          executionCwd,
          options,
          project,
        })
      ).exitCode,
  },
})
