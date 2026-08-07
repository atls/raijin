import type { CommandInput } from '../target.interfaces.js'

import { PortablePath }      from '@yarnpkg/fslib'
import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

export const toCommandArguments = (
  input: CommandInput,
  cwd: PortablePath = input.cwd
): Array<string> =>
  input.targets.map(({ path }) =>
    npath.fromPortablePath(ppath.relative(cwd, path) || PortablePath.dot))
