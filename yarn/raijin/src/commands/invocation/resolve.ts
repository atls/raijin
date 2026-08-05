import type { InvocationContext }          from './scope/context.interfaces.js'

import { resolveProjectCommandInvocation } from './scope/project.js'

export { resolveEntryCommandInvocation }     from './scope/entry.js'
export { resolveProjectCommandInvocation }   from './scope/project.js'
export { resolveWorkspaceCommandInvocation } from './scope/workspace.js'

export const executeProjectYarnCommand = async (
  context: InvocationContext,
  args: Array<string>
): Promise<number> => {
  const invocation = await resolveProjectCommandInvocation(context)

  return invocation.yarn.execute(args)
}
