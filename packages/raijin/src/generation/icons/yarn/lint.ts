import type { PortablePath }          from '@yarnpkg/fslib'

import type { YarnRuntimeInvocation } from '../../../commands/index.js'
import type { Linter }                from '../index.js'

import { createCommandInput }         from '../../../commands/index.js'
import { toCommandArguments }         from '../../../commands/index.js'

const createArguments = (cwd: PortablePath, files: ReadonlyArray<string>): Array<string> =>
  toCommandArguments(
    createCommandInput({
      cwd,
      source: 'generated',
      targets: Array.from(files),
    }),
    cwd
  )

export const create = (cwd: PortablePath, execute: YarnRuntimeInvocation['execute']): Linter => ({
  lint: async (files) => execute(['lint', '--fix', ...createArguments(cwd, files)]),
})
