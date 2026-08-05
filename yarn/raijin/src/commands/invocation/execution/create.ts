import type { ChildProcessInvocation }        from '../resolve.interfaces.js'
import type { ProjectInvocation }             from '../resolve.interfaces.js'
import type { ChildProcessInvocationOptions } from './create.interfaces.js'
import type { InvocationCapabilitiesOptions } from './create.interfaces.js'

import { ProjectScopeUnavailableError }       from '../exceptions/project-scope-unavailable.js'
import { executeChildProcess }                from '../adapters/child-process.js'
import { toNativeCwd }                        from '../adapters/path/index.js'
import { executeYarnCommand }                 from '../adapters/yarn/execution.js'

export const createChildProcessInvocation = ({
  context,
  executionCwd,
  projectCwd,
}: ChildProcessInvocationOptions): ChildProcessInvocation => ({
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

    return executeChildProcess(command, args, {
      context,
      cwd: toNativeCwd(options.scope === 'project' && projectCwd ? projectCwd : executionCwd),
      env: environment,
      input: options.input,
      output: options.output,
      timeout: options.timeout,
    })
  },
})

export const createInvocationCapabilities = ({
  configuration,
  context,
  executionCwd,
  project,
}: InvocationCapabilitiesOptions): Pick<ProjectInvocation, 'child' | 'yarn'> => ({
  child: createChildProcessInvocation({
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
