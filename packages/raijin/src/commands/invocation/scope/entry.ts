import type { Executor }           from '../executor.js'
import type { InvocationContext }  from './context.interfaces.js'
import type { EntryInvocation }    from './invocation.interfaces.js'

import { createProcessInvocation } from '../capabilities/create.js'
import { resolveInvocationCwd }    from './context.js'

export const resolveEntryCommandInvocation = (
  context: InvocationContext,
  executor: Executor
): EntryInvocation => {
  const invocationCwd = resolveInvocationCwd(context)

  return {
    process: createProcessInvocation({
      environment: context.env,
      executionCwd: invocationCwd,
      executor,
    }),
    executionCwd: invocationCwd,
    invocationCwd,
  }
}
