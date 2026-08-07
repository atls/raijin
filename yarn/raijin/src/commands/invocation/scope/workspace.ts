import type { InvocationContext }       from './context.interfaces.js'
import type { WorkspaceInvocation }     from './invocation.interfaces.js'

import { createProjectModel }           from '@atls/raijin/project'

import { createInvocationCapabilities } from '../capabilities/create.js'
import { resolveProjectScope }          from './project.js'

export const resolveWorkspaceCommandInvocation = async (
  context: InvocationContext
): Promise<WorkspaceInvocation> => {
  const { adapterContext, configuration, invocationCwd, project, workspace } =
    await resolveProjectScope(context)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    ...createInvocationCapabilities({
      configuration,
      context: adapterContext,
      executionCwd: resolvedWorkspace.cwd,
      project,
    }),
  }
}
