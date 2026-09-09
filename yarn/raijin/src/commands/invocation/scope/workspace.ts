import type { Executor }                from '../executor.js'
import type { InvocationContext }       from './context.interfaces.js'
import type { WorkspaceInvocation }     from './invocation.interfaces.js'

import { createProjectModel }           from '@atls/raijin/project'

import { createApplicationInvocation }  from '../capabilities/create.js'
import { createInvocationCapabilities } from '../capabilities/create.js'
import { resolveProjectScope }          from './project.js'

export const resolveWorkspaceCommandInvocation = async (
  context: InvocationContext,
  executor: Executor
): Promise<WorkspaceInvocation> => {
  const { configuration, invocationCwd, project, workspace } = await resolveProjectScope(context)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    application: createApplicationInvocation({
      environment: context.env,
      locator: resolvedWorkspace.anchoredLocator,
      project,
      streams: {
        stderr: context.stderr,
        stdin: context.stdin,
        stdout: context.stdout,
      },
    }),
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    ...createInvocationCapabilities({
      configuration,
      environment: context.env,
      executionCwd: resolvedWorkspace.cwd,
      executor,
      project,
    }),
  }
}
