import type { Configuration }  from '@yarnpkg/core'
import type { CommandContext } from '@yarnpkg/core'

import { execUtils }           from '@yarnpkg/core'

export const afterYarnVersionSet = async (
  configuration: Configuration,
  context: CommandContext
): Promise<void> => {
  await execUtils.pipevp('yarn', ['tools', 'sync'], {
    cwd: context.cwd,
    stdin: context.stdin,
    stdout: context.stdout,
    stderr: context.stderr,
    end: execUtils.EndStrategy.ErrorCode,
  })
}
