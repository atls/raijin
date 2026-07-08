import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'
import { npath }                       from '@yarnpkg/fslib'
import { ppath }                       from '@yarnpkg/fslib'

type PluginConfiguration = Parameters<typeof Configuration.find>[1]

export const COMMAND_PROXY_EXECUTION = 'COMMAND_PROXY_EXECUTION'
export const COMMAND_INVOCATION_CWD = 'RAIJIN_COMMAND_INVOCATION_CWD'

export interface ProjectCommandContext {
  configuration: Configuration
  invocationCwd: PortablePath
  project: YarnProject
}

export interface WorkspaceCommandContext extends ProjectCommandContext {
  workspace: Workspace
  workspaceCwd: PortablePath
}

const resolveInvocationCwd = (cwd: PortablePath): PortablePath => {
  const explicitInvocationCwd = process.env[COMMAND_INVOCATION_CWD]

  if (explicitInvocationCwd) {
    return npath.toPortablePath(explicitInvocationCwd)
  }

  const initCwd = process.env.INIT_CWD

  if (initCwd) {
    const portableInitCwd = npath.toPortablePath(initCwd)

    if (ppath.contains(cwd, portableInitCwd) !== null) {
      return portableInitCwd
    }
  }

  return cwd
}

export const createCommandProxyEnvironment = (
  cwd: PortablePath,
  env: NodeJS.ProcessEnv = {}
): NodeJS.ProcessEnv => ({
  ...env,
  [COMMAND_PROXY_EXECUTION]: 'true',
  [COMMAND_INVOCATION_CWD]: npath.fromPortablePath(resolveInvocationCwd(cwd)),
})

export const resolveProjectCommandContext = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<ProjectCommandContext> => {
  const invocationCwd = resolveInvocationCwd(cwd)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project } = await Project.find(configuration, invocationCwd)

  return {
    configuration,
    invocationCwd,
    project,
  }
}

export const resolveWorkspaceCommandContext = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<WorkspaceCommandContext> => {
  const invocationCwd = resolveInvocationCwd(cwd)
  const configuration = await Configuration.find(invocationCwd, plugins)
  const { project, workspace } = await Project.find(configuration, invocationCwd)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    configuration,
    invocationCwd,
    project,
    workspace: resolvedWorkspace,
    workspaceCwd: resolvedWorkspace.cwd,
  }
}
