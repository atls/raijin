import type { PortablePath }          from '@yarnpkg/fslib'

import type { Formatter }             from '../../../../application/icons/generation/index.js'
import type { YarnRuntimeInvocation } from '../../../../commands/index.js'

import { createCommandInput }         from '../../../../commands/index.js'
import { toCommandArguments }         from '../../../../commands/index.js'

const createArguments = (cwd: PortablePath, files: ReadonlyArray<string>): Array<string> =>
  toCommandArguments(
    createCommandInput({
      cwd,
      source: 'generated',
      targets: Array.from(files),
    }),
    cwd
  )

export const create = (
  cwd: PortablePath,
  execute: YarnRuntimeInvocation['execute']
): Formatter => ({
  format: async (files) => execute(['format', ...createArguments(cwd, files)]),
})
