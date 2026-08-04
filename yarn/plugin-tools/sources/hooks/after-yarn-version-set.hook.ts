import type { Configuration }        from '@yarnpkg/core'
import type { CommandContext }       from '@yarnpkg/core'

import { executeProjectYarnCommand } from '@atls/raijin/commands'

export const afterYarnVersionSet = async (
  configuration: Configuration,
  context: CommandContext
): Promise<void> => {
  await executeProjectYarnCommand(context, ['raijin', 'sync'])
}
