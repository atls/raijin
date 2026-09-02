import type { Input }         from './input.js'

import { createCommandInput } from '@atls/raijin/commands'

export const resolveInput = ({ files, invocationCwd, target }: Input) => {
  const targetInput = target
    ? createCommandInput({ cwd: invocationCwd, source: 'explicit', targets: [target] })
    : undefined
  const cwd = targetInput?.targets.at(0)?.path ?? invocationCwd

  return createCommandInput({ cwd, source: 'explicit', targets: files })
}
