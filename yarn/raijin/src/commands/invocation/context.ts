import type { PortablePath }               from '@yarnpkg/fslib'

import type { ProjectCommandInvocation }   from './invocation.interfaces.js'
import type { WorkspaceCommandInvocation } from './invocation.interfaces.js'
import type { CommandPluginConfiguration } from './invocation.interfaces.js'

import { Configuration }                   from '@yarnpkg/core'
import { Project }                         from '@yarnpkg/core'

import { createCommandPath }               from './path.js'
import { consumeCommandInvocationCwd }     from './proxy-state.js'

export const resolveProjectCommandInvocation = async (
  cwd: PortablePath,
  plugins: CommandPluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProjectCommandInvocation> => {
  const invocationCwd = consumeCommandInvocationCwd(cwd, environment)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project } = await Project.find(configuration, invocationCwd)
  const projectCwd = createCommandPath(project.cwd)

  return {
    configuration,
    cwd: {
      execution: projectCwd,
      invocation: createCommandPath(invocationCwd),
      project: projectCwd,
    },
    project,
  }
}

export const resolveWorkspaceCommandInvocation = async (
  cwd: PortablePath,
  plugins: CommandPluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceCommandInvocation> => {
  const invocationCwd = consumeCommandInvocationCwd(cwd, environment)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project, workspace } = await Project.find(configuration, invocationCwd)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    configuration,
    cwd: {
      execution: createCommandPath(resolvedWorkspace.cwd),
      invocation: createCommandPath(invocationCwd),
      project: createCommandPath(project.cwd),
    },
    project,
    workspace: resolvedWorkspace,
  }
}
