import type { CommandContext }              from '@yarnpkg/core'
import type { PluginConfiguration }         from '@yarnpkg/core'
import type { PortablePath }                from '@yarnpkg/fslib'

import type { InvocationExecutionContext }  from './adapters/child-process.interfaces.js'
import type { ProjectInvocation }           from './resolve.interfaces.js'
import type { WorkspaceInvocation }         from './resolve.interfaces.js'
import type { CommandInvocationResolution } from './resolve.interfaces.js'

import { npath }                            from '@yarnpkg/fslib'
import { ppath }                            from '@yarnpkg/fslib'

import { createProjectModel }               from '@atls/raijin/project'

import { executeChildProcess }              from './adapters/child-process.js'
import { toNativeCwd }                      from './adapters/path/index.js'
import { executeYarnCommand }               from './adapters/yarn/execution.js'
import { resolveProject }                   from './adapters/yarn/project.js'
import { activateProjectRuntime }           from './adapters/yarn/runtime.js'
import { ensureProjectRuntime }             from './adapters/yarn/runtime.js'

type InvocationContext = Pick<
  CommandContext,
  'cwd' | 'env' | 'plugins' | 'stderr' | 'stdin' | 'stdout'
>

const createInvocationContext = (
  cwd: PortablePath,
  plugins: PluginConfiguration,
  environment: NodeJS.ProcessEnv
): InvocationContext => ({
  cwd,
  env: environment,
  plugins,
  stderr: process.stderr,
  stdin: process.stdin,
  stdout: process.stdout,
})

const createExecutionContext = (context: InvocationContext): InvocationExecutionContext => ({
  environment: context.env,
  stderr: context.stderr,
  stdin: context.stdin,
  stdout: context.stdout,
})

const createInvocationRuntime = (
  getInvocation: () => ProjectInvocation,
  context: InvocationExecutionContext,
  configuration: ProjectInvocation['yarn']['configuration'],
  project: ProjectInvocation['yarn']['project']
): Pick<ProjectInvocation, 'child' | 'yarn'> => ({
  child: {
    execute: async (command, args, options = {}) => {
      const invocation = getInvocation()

      return executeChildProcess(command, args, {
        context,
        cwd: toNativeCwd(invocation.executionCwd),
        env: options.environment
          ? await options.environment({ ...context.environment })
          : { ...context.environment },
        input: options.input,
        output: options.output,
        timeout: options.timeout,
      })
    },
  },
  yarn: {
    configuration,
    project,
    capture: async (args, options = {}) => {
      const { forwardOutput, ...runOptions } = options

      return executeYarnCommand({
        args,
        context,
        invocation: getInvocation(),
        options: {
          ...runOptions,
          output: { mode: 'capture', forward: forwardOutput },
        },
      })
    },
    execute: async (args, options) =>
      (
        await executeYarnCommand({
          args,
          context,
          invocation: getInvocation(),
          options,
        })
      ).exitCode,
  },
})

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

const resolveProjectInvocationInternal = async (
  context: InvocationContext,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<ProjectInvocation>> => {
  const executionContext = createExecutionContext(context)
  const invocationCwd = resolveInitCwd(context.cwd, context.env)
  const { configuration, project } = await resolveProject(invocationCwd, context.plugins)

  if (ensureRuntime) {
    const exitCode = await ensureProjectRuntime(project, executionContext)

    if (exitCode !== undefined) {
      return { exitCode }
    }
  }

  await activateProjectRuntime(project)

  const invocation: ProjectInvocation = {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    ...createInvocationRuntime(() => invocation, executionContext, configuration, project),
  }

  return invocation
}

export async function resolveProjectInvocation(
  cwdOrContext: InvocationContext | PortablePath,
  plugins?: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<ProjectInvocation> {
  const context =
    typeof cwdOrContext === 'string'
      ? createInvocationContext(cwdOrContext, plugins!, environment)
      : cwdOrContext

  return resolveProjectInvocationInternal(context, false) as Promise<ProjectInvocation>
}

export const resolveProjectCommandInvocation = async (
  context: InvocationContext
): Promise<CommandInvocationResolution<ProjectInvocation>> =>
  resolveProjectInvocationInternal(context, true)

const resolveWorkspaceInvocationInternal = async (
  context: InvocationContext,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<WorkspaceInvocation>> => {
  const executionContext = createExecutionContext(context)
  const invocationCwd = resolveInitCwd(context.cwd, context.env)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, context.plugins)

  if (ensureRuntime) {
    const exitCode = await ensureProjectRuntime(project, executionContext)

    if (exitCode !== undefined) {
      return { exitCode }
    }
  }

  await activateProjectRuntime(project)

  const resolvedWorkspace = workspace ?? project.getWorkspaceByFilePath(invocationCwd)

  const invocation: WorkspaceInvocation = {
    executionCwd: resolvedWorkspace.cwd,
    invocationCwd,
    project: createProjectModel(project),
    workspace: resolvedWorkspace,
    ...createInvocationRuntime(() => invocation, executionContext, configuration, project),
  }

  return invocation
}

export async function resolveWorkspaceInvocation(
  cwdOrContext: InvocationContext | PortablePath,
  plugins?: PluginConfiguration,
  environment: NodeJS.ProcessEnv = process.env
): Promise<WorkspaceInvocation> {
  const context =
    typeof cwdOrContext === 'string'
      ? createInvocationContext(cwdOrContext, plugins!, environment)
      : cwdOrContext

  return resolveWorkspaceInvocationInternal(context, false) as Promise<WorkspaceInvocation>
}

export const resolveWorkspaceCommandInvocation = async (
  context: InvocationContext
): Promise<CommandInvocationResolution<WorkspaceInvocation>> =>
  resolveWorkspaceInvocationInternal(context, true)
