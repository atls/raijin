import type { InvocationContext }          from '../scope/context.interfaces.js'

import { createExecaProcessExecutor }      from '../../../infrastructure/process/execa/executor.js'
import { resolveProjectCommandInvocation } from '../scope/project.js'

export const executeProjectYarnCommand = async (
  context: InvocationContext,
  args: Array<string>
): Promise<number> => {
  const executor = createExecaProcessExecutor(context)
  const invocation = await resolveProjectCommandInvocation(context, executor)

  return invocation.yarn.execute(args)
}
