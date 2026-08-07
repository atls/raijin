import type { InvocationContext }         from './context.interfaces.js'
import type { EntryInvocation }           from './invocation.interfaces.js'

import { createInvocationAdapterContext } from '../adapters/context.js'
import { createProcessInvocation }        from '../capabilities/create.js'
import { resolveInvocationCwd }           from './context.js'

export const resolveEntryCommandInvocation = (context: InvocationContext): EntryInvocation => {
  const adapterContext = createInvocationAdapterContext(context)
  const invocationCwd = resolveInvocationCwd(context)

  return {
    process: createProcessInvocation({
      context: adapterContext,
      executionCwd: invocationCwd,
    }),
    executionCwd: invocationCwd,
    invocationCwd,
  }
}
