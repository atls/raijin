import type { Configuration }       from '@yarnpkg/core'
import type { CommandContext }      from '@yarnpkg/core'

import { resolveProjectInvocation } from '@atls/raijin/commands'

export const afterYarnVersionSet = async (
  configuration: Configuration,
  context: CommandContext
): Promise<void> => {
  const invocation = await resolveProjectInvocation(context)

  await invocation.yarn.execute(['raijin', 'sync'])
}
