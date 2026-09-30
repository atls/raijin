import type { InvocationContext }          from '../scope/interfaces/context.js'

import { create as createProcessExecutor } from '../../../execution/process/executor.js'
import { resolveProjectCommandInvocation } from '../scope/project.js'

export const executeProjectYarnCommand = async (
  context: InvocationContext,
  args: Array<string>
): Promise<number> => {
  const executor = createProcessExecutor(context)
  const invocation = await resolveProjectCommandInvocation(context, executor)

  return invocation.yarn.execute(args)
}
