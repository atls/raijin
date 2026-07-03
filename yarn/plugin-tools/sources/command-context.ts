import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'

type PluginConfiguration = Parameters<typeof Configuration.find>[1]

export interface ProjectCommandContext {
  configuration: Configuration
  invocationCwd: PortablePath
  project: YarnProject
}

export interface WorkspaceCommandContext extends ProjectCommandContext {
  workspace: Workspace
  workspaceCwd: PortablePath
}

export const resolveProjectCommandContext = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<ProjectCommandContext> => {
  const configuration = await Configuration.find(cwd, plugins)
  const { project } = await Project.find(configuration, cwd)

  return {
    configuration,
    invocationCwd: cwd,
    project,
  }
}

export const resolveWorkspaceCommandContext = async (
  cwd: PortablePath,
  plugins: PluginConfiguration
): Promise<WorkspaceCommandContext> => {
  const configuration = await Configuration.find(cwd, plugins)
  const { project, workspace } = await Project.find(configuration, cwd)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(cwd)

  return {
    configuration,
    invocationCwd: cwd,
    project,
    workspace: resolvedWorkspace,
    workspaceCwd: resolvedWorkspace.cwd,
  }
}
