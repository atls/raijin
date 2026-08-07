import type { InvocationContext }         from './context.interfaces.js'
import type { ProjectInvocation }         from './invocation.interfaces.js'
import type { ResolvedProjectScope }      from './project.interfaces.js'

import { createProjectModel }             from '@atls/raijin/project'

import { UnsupportedNodeLinkerError }     from '../exceptions/unsupported-node-linker.js'
import { createInvocationAdapterContext } from '../adapters/context.js'
import { resolveProject }                 from '../adapters/yarn/project.js'
import { createInvocationCapabilities }   from '../capabilities/create.js'
import { resolveInvocationCwd }           from './context.js'

export const resolveProjectScope = async (
  context: InvocationContext
): Promise<ResolvedProjectScope> => {
  const adapterContext = createInvocationAdapterContext(context)
  const invocationCwd = resolveInvocationCwd(context)
  const { configuration, project, workspace } = await resolveProject(invocationCwd, context.plugins)
  const nodeLinker = project.configuration.get('nodeLinker')

  if (nodeLinker !== 'pnp') {
    throw new UnsupportedNodeLinkerError(nodeLinker)
  }

  return { adapterContext, configuration, invocationCwd, project, workspace }
}

export const resolveProjectCommandInvocation = async (
  context: InvocationContext
): Promise<ProjectInvocation> => {
  const { adapterContext, configuration, invocationCwd, project } =
    await resolveProjectScope(context)

  return {
    executionCwd: project.cwd,
    invocationCwd,
    project: createProjectModel(project),
    ...createInvocationCapabilities({
      configuration,
      context: adapterContext,
      executionCwd: project.cwd,
      project,
    }),
  }
}

export const executeProjectYarnCommand = async (
  context: InvocationContext,
  args: Array<string>
): Promise<number> => {
  const invocation = await resolveProjectCommandInvocation(context)

  return invocation.yarn.execute(args)
}
