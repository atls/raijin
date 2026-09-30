import type { PortablePath }      from '@yarnpkg/fslib'

import type { InvocationContext } from './interfaces/context.js'

import { npath }                  from '@yarnpkg/fslib'
import { ppath }                  from '@yarnpkg/fslib'

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
