import type { ProcessExecutor }         from '../capabilities/process.interfaces.js'
import type { InvocationContext }       from './context.interfaces.js'
import type { ProjectInvocation }       from './invocation.interfaces.js'
import type { ResolvedProjectScope }    from './project.interfaces.js'

import { createProjectModel }           from '@atls/raijin/project'

import { UnsupportedNodeLinkerError }   from '../exceptions/unsupported-node-linker.js'
import { resolveProject }               from '../adapters/yarn/project.js'
import { createInvocationCapabilities } from '../capabilities/create.js'
import { resolveInvocationCwd }         from './context.js'

export const resolveProjectScope = async (
  context: InvocationContext
): Promise<ResolvedProjectScope> => {
  const invocationCwd = resolveInvocationCwd(context)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, context.plugins)
  const nodeLinker = project.configuration.get('nodeLinker')

  if (nodeLinker !== 'pnp') {
    throw new UnsupportedNodeLinkerError(nodeLinker)
  }

  return { configuration, invocationCwd, project, workspace }
}

export const resolveProjectCommandInvocation = async (
  context: InvocationContext,
  executor: ProcessExecutor
): Promise<ProjectInvocation> => {
  const { configuration, invocationCwd, project } = await resolveProjectScope(context)

  return {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    ...createInvocationCapabilities({
      configuration,
      environment: context.env,
      executionCwd: project.cwd,
      executor,
      project,
    }),
  }
}
