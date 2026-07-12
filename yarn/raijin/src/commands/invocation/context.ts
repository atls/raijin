import type { PortablePath }               from '@yarnpkg/fslib'

import type { ProjectCommandInvocation }   from './invocation.interfaces.js'
import type { WorkspaceCommandInvocation } from './invocation.interfaces.js'
import type { CommandPluginConfiguration } from './invocation.interfaces.js'

import { Configuration }                   from '@yarnpkg/core'
import { Project }                         from '@yarnpkg/core'
import { npath }                           from '@yarnpkg/fslib'
import { ppath }                           from '@yarnpkg/fslib'

export const COMMAND_INVOCATION_CWD = 'RAIJIN_COMMAND_INVOCATION_CWD'

export const resolveInvocationCwd = (
  cwd: PortablePath,
  environment: NodeJS.ProcessEnv = process.env
): PortablePath => {
  const explicitInvocationCwd = environment[COMMAND_INVOCATION_CWD]

  if (explicitInvocationCwd) {
    return npath.toPortablePath(explicitInvocationCwd)
  }

  const initCwd = environment.INIT_CWD

  if (initCwd) {
    const portableInitCwd = npath.toPortablePath(initCwd)

    if (ppath.contains(cwd, portableInitCwd) !== null) {
      return portableInitCwd
    }
  }

  return cwd
}

export const resolveProjectCommandInvocation = async (
  cwd: PortablePath,
  plugins: CommandPluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProjectCommandInvocation> => {
  const invocationCwd = resolveInvocationCwd(cwd, environment)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project } = await Project.find(configuration, invocationCwd)

  return {
    configuration,
    executionCwd: project.cwd,
    invocationCwd,
    project,
  }
}

export const resolveWorkspaceCommandInvocation = async (
  cwd: PortablePath,
  plugins: CommandPluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceCommandInvocation> => {
  const invocationCwd = resolveInvocationCwd(cwd, environment)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project, workspace } = await Project.find(configuration, invocationCwd)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    configuration,
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project,
    workspace: resolvedWorkspace,
    workspaceCwd: resolvedWorkspace.cwd,
  }
}
