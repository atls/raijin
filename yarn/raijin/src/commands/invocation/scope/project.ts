import type { ProjectInvocation }           from '../resolve.interfaces.js'
import type { InvocationContext }           from './context.interfaces.js'
import type { ResolvedProjectScope }        from './project.interfaces.js'

import { createProjectModel }               from '@atls/raijin/project'

import { UnsupportedNodeLinkerError }       from '../exceptions/unsupported-node-linker.js'
import { resolveProject }                   from '../adapters/yarn/project.js'
import { createInvocationCapabilities }     from '../execution/create.js'
import { createInvocationExecutionContext } from './context.js'
import { resolveInvocationCwd }             from './context.js'

export const resolveProjectScope = async (
  context: InvocationContext
): Promise<ResolvedProjectScope> => {
  const executionContext = createInvocationExecutionContext(context)
  const invocationCwd = resolveInvocationCwd(context)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, context.plugins)
  const nodeLinker = project.configuration.get('nodeLinker')

  if (nodeLinker !== 'pnp') {
    throw new UnsupportedNodeLinkerError(nodeLinker)
  }

  return { configuration, executionContext, invocationCwd, project, workspace }
}

export const resolveProjectCommandInvocation = async (
  context: InvocationContext
): Promise<ProjectInvocation> => {
  const { configuration, executionContext, invocationCwd, project } =
    await resolveProjectScope(context)

  return {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    ...createInvocationCapabilities({
      configuration,
      context: executionContext,
      executionCwd: project.cwd,
      project,
    }),
  }
}
