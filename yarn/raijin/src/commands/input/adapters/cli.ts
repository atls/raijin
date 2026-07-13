import type { PortablePath } from '@yarnpkg/fslib'

import type { CommandInput } from '../target.interfaces.js'

import { npath }             from '@yarnpkg/fslib'
import { ppath }             from '@yarnpkg/fslib'

export const toCommandArguments = (
  input: CommandInput,
  cwd: PortablePath = input.cwd
): Array<string> =>
  input.targets.map(({ path }) => npath.fromPortablePath(ppath.relative(cwd, path)))
