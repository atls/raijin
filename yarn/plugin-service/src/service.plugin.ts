import { Plugin }              from '@yarnpkg/core'

import { ServiceBuildCommand } from './service-build.command.js'
import { ServiceDevCommand }   from './service-dev.command.js'

export const plugin: Plugin = {
  commands: [ServiceBuildCommand, ServiceDevCommand],
}
