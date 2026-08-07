import type { InvocationContext }        from '../scope/context.interfaces.js'
import type { InvocationAdapterContext } from './context.interfaces.js'

export const createInvocationAdapterContext = (
  context: InvocationContext
): InvocationAdapterContext => ({
  environment: context.env,
  stderr: context.stderr,
  stdin: context.stdin,
  stdout: context.stdout,
})
