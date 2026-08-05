import type { PortablePath }               from '@yarnpkg/fslib'

import type { InvocationExecutionContext } from '../execution/context.interfaces.js'
import type { InvocationContext }          from './context.interfaces.js'

import { npath }                           from '@yarnpkg/fslib'
import { ppath }                           from '@yarnpkg/fslib'

export const createInvocationExecutionContext = (
  context: InvocationContext
): InvocationExecutionContext => ({
  environment: context.env,
  stderr: context.stderr,
  stdin: context.stdin,
  stdout: context.stdout,
})

export const resolveInvocationCwd = ({ cwd, env }: InvocationContext): PortablePath => {
  const initCwd = env.INIT_CWD

  if (initCwd) {
    const portableInitCwd = npath.toPortablePath(initCwd)

    if (ppath.contains(cwd, portableInitCwd) !== null) {
      return portableInitCwd
    }
  }

  return cwd
}
