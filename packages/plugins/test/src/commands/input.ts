import type { CommandInput }  from '@atls/raijin/commands'
import type { PortablePath }  from '@yarnpkg/fslib'

import { createCommandInput } from '@atls/raijin/commands'

interface TestCommandInputOptions {
  files: Array<string>
  invocationCwd: PortablePath
  target?: string
}

export const createTestCommandInput = ({
  files,
  invocationCwd,
  target,
}: TestCommandInputOptions): CommandInput => {
  const targetInput = target
    ? createCommandInput({ cwd: invocationCwd, source: 'explicit', targets: [target] })
    : undefined
  const cwd = targetInput?.targets.at(0)?.path ?? invocationCwd

  return createCommandInput({ cwd, source: 'explicit', targets: files })
}
