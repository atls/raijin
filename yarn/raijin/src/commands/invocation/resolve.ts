import type { PluginConfiguration }         from '@yarnpkg/core'
import type { PortablePath }                from '@yarnpkg/fslib'

import type { ProjectInvocation }           from './resolve.interfaces.js'
import type { WorkspaceInvocation }         from './resolve.interfaces.js'
import type { CommandInvocationResolution } from './resolve.interfaces.js'

import { npath }                            from '@yarnpkg/fslib'
import { ppath }                            from '@yarnpkg/fslib'

import { createProjectModel }               from '@atls/raijin/project'

import { spawnChildProcess }                from './adapters/child-process.js'
import { waitForChildProcess }              from './adapters/child-process.js'
import { createYarnExecutable }             from './adapters/yarn/execution.js'
import { executeYarnCommand }               from './adapters/yarn/execution.js'
import { resolveProject }                   from './adapters/yarn/project.js'
import { activateProjectRuntime }           from './adapters/yarn/runtime.js'
import { ensureProjectRuntime }             from './adapters/yarn/runtime.js'

export const INVOCATION_CWD_ENV = 'RAIJIN_COMMAND_INVOCATION_CWD'
export const PROXY_ENV = 'RAIJIN_COMMAND_PROXY_EXECUTION'

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

const resolveProjectInvocationInternal = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<ProjectInvocation>> => {
  const invocationCwd = consumeInvocationCwd(cwd, environment)
  const { configuration, project } = await resolveProject(invocationCwd, plugins)

  if (ensureRuntime) {
    const exitCode = await ensureProjectRuntime(project)

    if (exitCode !== undefined) {
      return { exitCode }
    }

    await activateProjectRuntime(project)
  }

  const invocation: ProjectInvocation = {
    executionCwd: project.cwd,
    invocationCwd,
    child: {
      spawn: (command, args, options) => spawnChildProcess(invocation, command, args, options),
      wait: async (child) => waitForChildProcess(child),
    },
    project: createProjectModel(project),
    yarn: {
      configuration,
      project,
      createExecutable: async (options) => createYarnExecutable({ ...options, project }),
      execute: async (args, options) => executeYarnCommand({ ...options, args, invocation }),
    },
  }

  return invocation
}

export const resolveProjectInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProjectInvocation> =>
  resolveProjectInvocationInternal(cwd, plugins, environment, false) as Promise<ProjectInvocation>

export const resolveProjectCommandInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<CommandInvocationResolution<ProjectInvocation>> =>
  resolveProjectInvocationInternal(cwd, plugins, environment, true)

const resolveWorkspaceInvocationInternal = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<WorkspaceInvocation>> => {
  const invocationCwd = consumeInvocationCwd(cwd, environment)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, plugins)

  if (ensureRuntime) {
    const exitCode = await ensureProjectRuntime(project)

    if (exitCode !== undefined) {
      return { exitCode }
    }

    await activateProjectRuntime(project)
  }

  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  const invocation: WorkspaceInvocation = {
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    child: {
      spawn: (command, args, options) => spawnChildProcess(invocation, command, args, options),
      wait: async (child) => waitForChildProcess(child),
    },
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    yarn: {
      configuration,
      project,
      createExecutable: async (options) => createYarnExecutable({ ...options, project }),
      execute: async (args, options) => executeYarnCommand({ ...options, args, invocation }),
    },
  }

  return invocation
}

export const resolveWorkspaceInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceInvocation> =>
  resolveWorkspaceInvocationInternal(
    cwd,
    plugins,
    environment,
    false
  ) as Promise<WorkspaceInvocation>

export const resolveWorkspaceCommandInvocation = async (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<CommandInvocationResolution<WorkspaceInvocation>> =>
  resolveWorkspaceInvocationInternal(cwd, plugins, environment, true)
