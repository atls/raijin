import type { EntryInvocation }             from '../resolve.interfaces.js'
import type { InvocationContext }           from './context.interfaces.js'

import { createChildProcessInvocation }     from '../execution/create.js'
import { createInvocationExecutionContext } from './context.js'
import { resolveInvocationCwd }             from './context.js'

export const resolveEntryCommandInvocation = (context: InvocationContext): EntryInvocation => {
  const executionContext = createInvocationExecutionContext(context)
  const invocationCwd = resolveInvocationCwd(context)

  return {
    child: createChildProcessInvocation({
      context: executionContext,
      executionCwd: invocationCwd,
    }),
    executionCwd: invocationCwd,
    invocationCwd,
  }
}
