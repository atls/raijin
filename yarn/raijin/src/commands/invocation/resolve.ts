import type { Configuration }          from '@yarnpkg/core'
import type { Project as YarnProject } from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'
import type { PortablePath }           from '@yarnpkg/fslib'

import type { RaijinProjectModel }     from '../../project/index.js'
import type { PluginConfiguration }    from './adapters/yarn/project.js'

import { npath }                       from '@yarnpkg/fslib'
import { ppath }                       from '@yarnpkg/fslib'

import { createProjectModel }          from '../../project/index.js'
import { resolveProject }              from './adapters/yarn/project.js'

export const INVOCATION_CWD_ENV = 'RAIJIN_COMMAND_INVOCATION_CWD'
export const PROXY_ENV = 'RAIJIN_COMMAND_PROXY_EXECUTION'

export interface ProjectInvocation {
  readonly executionCwd: PortablePath
  readonly invocationCwd: PortablePath
  readonly project: RaijinProjectModel<Workspace>
  readonly yarn: {
    configuration: Configuration
    project: YarnProject
  }
}

export interface WorkspaceInvocation extends ProjectInvocation {
  readonly workspace: Workspace
}

const resolveInitCwd = (cwd: PortablePath, environment: NodeJS.ProcessEnv): PortablePath => {
  const initCwd = environment.INIT_CWD

  if (initCwd) {
    const portableInitCwd = npath.toPortablePath(initCwd)

    if (ppath.contains(cwd, portableInitCwd) !== null) {
      return portableInitCwd
    }
  }

  return cwd
}

const consumeInvocationCwd = (cwd: PortablePath, environment: NodeJS.ProcessEnv): PortablePath => {
  const isProxy = environment[PROXY_ENV] === 'true'
  const invocationCwd = environment[INVOCATION_CWD_ENV]

  Reflect.deleteProperty(environment, PROXY_ENV)
  Reflect.deleteProperty(environment, INVOCATION_CWD_ENV)

  if (!isProxy) {
    return resolveInitCwd(cwd, environment)
  }

  if (!invocationCwd) {
    throw new Error('Command proxy invocation cwd is missing')
  }

  return npath.toPortablePath(invocationCwd)
}

export const resolveProjectInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProjectInvocation> => {
  const invocationCwd = consumeInvocationCwd(cwd, environment)
  const { configuration, project } = await resolveProject(invocationCwd, plugins)

  return {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    yarn: { configuration, project },
  }
}

export const resolveWorkspaceInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceInvocation> => {
  const invocationCwd = consumeInvocationCwd(cwd, environment)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, plugins)
  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  return {
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    yarn: { configuration, project },
  }
}
