import type { CommandContext }              from '@yarnpkg/core'
import type { Workspace }                   from '@yarnpkg/core'
import type { PortablePath }                from '@yarnpkg/fslib'

import type { InvocationExecutionContext }  from './adapters/child-process.interfaces.js'
import type { ChildProcessInvocation }      from './resolve.interfaces.js'
import type { CommandInvocationExit }       from './resolve.interfaces.js'
import type { EntryInvocation }             from './resolve.interfaces.js'
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
import { ensureProjectRuntime }             from './adapters/yarn/runtime.js'
import { validateProjectRuntime }           from './adapters/yarn/runtime.js'

type InvocationContext = Pick<
  CommandContext,
  'cwd' | 'env' | 'plugins' | 'stderr' | 'stdin' | 'stdout'
>

interface ResolvedInvocationContext {
  configuration: ProjectInvocation['yarn']['configuration']
  executionContext: InvocationExecutionContext
  invocationCwd: PortablePath
  project: ProjectInvocation['yarn']['project']
  workspace: Workspace | null
}

const createExecutionContext = (context: InvocationContext): InvocationExecutionContext => ({
  environment: context.env,
  stderr: context.stderr,
  stdin: context.stdin,
  stdout: context.stdout,
})

const createChildProcessInvocation = (
  resolveExecutionCwd: (scope: 'execution' | 'project') => PortablePath,
  context: InvocationExecutionContext
): ChildProcessInvocation => ({
  execute: async (command, args, options = {}) => {
    const environment = { ...context.environment }
    const nodeOptions = await options.nodeOptions?.(environment.NODE_OPTIONS)

    if (options.nodeOptions) {
      if (nodeOptions) {
        environment.NODE_OPTIONS = nodeOptions
      } else {
        Reflect.deleteProperty(environment, 'NODE_OPTIONS')
      }
    }

    return executeChildProcess(command, args, {
      context,
      cwd: toNativeCwd(resolveExecutionCwd(options.scope ?? 'execution')),
      env: environment,
      input: options.input,
      output: options.output,
      timeout: options.timeout,
    })
  },
})

const createInvocationRuntime = (
  getInvocation: () => ProjectInvocation,
  context: InvocationExecutionContext,
  configuration: ProjectInvocation['yarn']['configuration'],
  project: ProjectInvocation['yarn']['project']
): Pick<ProjectInvocation, 'child' | 'yarn'> => ({
  child: createChildProcessInvocation((scope) => {
    const invocation = getInvocation()

    return scope === 'project' ? invocation.project.cwd : invocation.executionCwd
  }, context),
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

export const resolveEntryCommandInvocation = (context: InvocationContext): EntryInvocation => {
  const executionContext = createExecutionContext(context)
  const invocationCwd = resolveInitCwd(context.cwd, context.env)

  return {
    child: createChildProcessInvocation((scope) => {
      if (scope === 'project') {
        throw new Error('Entry command invocation does not have project execution scope')
      }

      return invocationCwd
    }, executionContext),
    executionCwd: invocationCwd,
    invocationCwd,
  }
}

const resolveInvocationContext = async (
  context: InvocationContext,
  ensureRuntime: boolean
): Promise<CommandInvocationExit | ResolvedInvocationContext> => {
  const executionContext = createExecutionContext(context)
  const invocationCwd = resolveInitCwd(context.cwd, context.env)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, context.plugins)

  validateProjectRuntime(project)

  if (ensureRuntime) {
    const exitCode = await ensureProjectRuntime(project, executionContext)

    if (exitCode !== undefined) {
      return { exitCode }
    }
  }

  return { configuration, executionContext, invocationCwd, project, workspace }
}

const resolveProjectInvocationInternal = async (
  context: InvocationContext,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<ProjectInvocation>> => {
  const resolution = await resolveInvocationContext(context, ensureRuntime)

  if ('exitCode' in resolution) {
    return resolution
  }

  const { configuration, executionContext, invocationCwd, project } = resolution

  const invocation: ProjectInvocation = {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    ...createInvocationRuntime(() => invocation, executionContext, configuration, project),
  }

  return invocation
}

export const resolveProjectCommandInvocation = async (
  context: InvocationContext
): Promise<CommandInvocationResolution<ProjectInvocation>> =>
  resolveProjectInvocationInternal(context, true)

const resolveWorkspaceInvocationInternal = async (
  context: InvocationContext,
  ensureRuntime: boolean
): Promise<CommandInvocationResolution<WorkspaceInvocation>> => {
  const resolution = await resolveInvocationContext(context, ensureRuntime)

  if ('exitCode' in resolution) {
    return resolution
  }

  const { configuration, executionContext, invocationCwd, project, workspace } = resolution

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

export const resolveWorkspaceCommandInvocation = async (
  context: InvocationContext
): Promise<CommandInvocationResolution<WorkspaceInvocation>> =>
  resolveWorkspaceInvocationInternal(context, true)

export const executeProjectYarnCommand = async (
  context: InvocationContext,
  args: Array<string>
): Promise<number> => {
  const invocation = await resolveProjectInvocationInternal(context, false)

  if ('exitCode' in invocation) {
    return invocation.exitCode
  }

  return invocation.yarn.execute(args)
}
