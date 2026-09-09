import type { Plugin }              from '@yarnpkg/core'

import { defineCommandInvocations } from '@atls/raijin/commands'

import { ServiceBuildCommand }      from './build/command.jsx'
import { ServiceDevCommand }        from './development/command.jsx'
import { ServiceStartCommand }      from './start/command.js'

export const plugin: Plugin = {
  commands: defineCommandInvocations({
    workspace: [ServiceBuildCommand, ServiceDevCommand, ServiceStartCommand],
  }),
}
