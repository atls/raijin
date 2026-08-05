import type { InvocationContext }           from './context.interfaces.js'
import type { EntryInvocation }             from './invocation.interfaces.js'

import { createProcessInvocation }          from '../execution/capabilities.js'
import { createInvocationExecutionContext } from './context.js'
import { resolveInvocationCwd }             from './context.js'

export const resolveEntryCommandInvocation = (context: InvocationContext): EntryInvocation => {
  const executionContext = createInvocationExecutionContext(context)
  const invocationCwd = resolveInvocationCwd(context)

  return {
    process: createProcessInvocation({
      context: executionContext,
      executionCwd: invocationCwd,
    }),
    executionCwd: invocationCwd,
    invocationCwd,
  }
}
