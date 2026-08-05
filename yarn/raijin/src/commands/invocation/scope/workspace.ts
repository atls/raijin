import type { WorkspaceInvocation }     from '../resolve.interfaces.js'
import type { InvocationContext }       from './context.interfaces.js'

import { createProjectModel }           from '@atls/raijin/project'

import { createInvocationCapabilities } from '../execution/create.js'
import { resolveProjectScope }          from './project.js'

export const resolveWorkspaceCommandInvocation = async (
  context: InvocationContext
): Promise<WorkspaceInvocation> => {
  const { configuration, executionContext, invocationCwd, project, workspace } =
    await resolveProjectScope(context)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    ...createInvocationCapabilities({
      configuration,
      context: executionContext,
      executionCwd: resolvedWorkspace.cwd,
      project,
    }),
  }
}
